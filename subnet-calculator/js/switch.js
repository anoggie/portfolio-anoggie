const toggle = document.getElementById('ipVersionToggle');
const ipLabel = document.querySelector('label[for="ip"]');
const ipInput = document.getElementById('ip');
const cidrLabel = document.querySelector('label[for="cidr"]');
const cidrInput = document.getElementById('cidr');
const form = document.getElementById('cidrForm');
const output = document.getElementById('resultados');

// --- PARTE 1: REFERÊNCIA AO CAMPO "DIVIDIR EM" ---
const newCidrGroup = document.getElementById('newCidrGroup');
const newCidrInput = document.getElementById('newCidr');

// --- PARTE 2: MOSTRAR/ESCONDER O CAMPO "DIVIDIR EM" ---
function updateCIDRForVersion() {
  if (toggle.checked) {
    ipLabel.textContent = 'Endereço IPv6:';
    ipInput.placeholder = 'ex: 2001:db8:acad::';
    cidrLabel.textContent = 'CIDR:';
    cidrInput.placeholder = 'ex: 48';
    cidrInput.min = 1;
    cidrInput.max = 128;
    if (newCidrGroup) newCidrGroup.style.display = 'flex'; 
  } else {
    ipLabel.textContent = 'Endereço IPv4:';
    ipInput.placeholder = 'ex: 192.168.0.1';
    cidrLabel.textContent = 'CIDR:';
    cidrInput.placeholder = 'ex: 24';
    cidrInput.min = 1;
    cidrInput.max = 32;
    if (newCidrGroup) newCidrGroup.style.display = 'none'; 
  }
  if (newCidrInput) newCidrInput.value = ''; 
  output.innerHTML = '';
}

toggle.addEventListener('change', updateCIDRForVersion);

// ---------- Funções IPv4 ----------
function validarIPv4(ip) {
  const partes = ip.trim().split('.');
  if (partes.length !== 4) return false;
  return partes.every(parte => {
    const num = Number(parte);
    return !isNaN(num) && num >= 0 && num <= 255;
  });
}

function ipParaBinario(ip) {
  return ip.split('.').map(parte => parseInt(parte).toString(2).padStart(8, '0')).join('');
}

function binarioParaIP(binario) {
  return Array.from({ length: 4 }, (_, i) =>
    parseInt(binario.slice(i * 8, i * 8 + 8), 2)
  ).join('.');
}

function calcularSubredeIPv4(ip, cidr) {
  const ipBin = ipParaBinario(ip);
  const mascaraBin = '1'.repeat(cidr).padEnd(32, '0');
  const redeBin = [...ipBin].map((bit, i) => bit === '1' && mascaraBin[i] === '1' ? '1' : '0').join('');
  const broadcastBin = redeBin.slice(0, cidr) + '1'.repeat(32 - cidr);
  const primeiroHostBin = redeBin.slice(0, 31) + '1';
  const ultimoHostBin = broadcastBin.slice(0, 31) + '0';

  let hostsValidos, primeiroHost, ultimoHost;
  if (cidr === 32) {
    hostsValidos = 'não aplicável';
    primeiroHost = ultimoHost = ip;
  } else if (cidr === 31) {
    hostsValidos = '2 (ponto-a-ponto)';
    primeiroHost = binarioParaIP(primeiroHostBin);
    ultimoHost = binarioParaIP(ultimoHostBin);
  } else {
    hostsValidos = Math.pow(2, 32 - cidr) - 2;
    primeiroHost = binarioParaIP(primeiroHostBin);
    ultimoHost = binarioParaIP(ultimoHostBin);
  }

  return {
    ipAddress: `${ip}/${cidr}`,
    fullIPAddress: ip,
    subnetMask: binarioParaIP(mascaraBin),
    network: binarioParaIP(redeBin),
    firstHost: primeiroHost,
    lastHost: ultimoHost,
    broadcast: binarioParaIP(broadcastBin),
    validHosts: hostsValidos
  };
}

// ---------- Funções IPv6 ----------
function expandIPv6(address) {
  let parts = address.split('::');
  let left = parts[0] ? parts[0].split(':') : [];
  let right = parts[1] ? parts[1].split(':') : [];
  let missing = 8 - (left.length + right.length);
  if (missing < 0) { 
      if (address.split(':').length === 8) return address.split(':').map(part => part.padStart(4, '0')).join(':');
      throw new Error("Formato IPv6 inválido.");
  }
  let zeros = Array(missing).fill('0000');
  let full = [...left, ...zeros, ...right].map(part => part.padStart(4, '0'));
  return full.join(':');
}

function ipv6ToBigInt(ip) {
  return BigInt('0x' + expandIPv6(ip).replace(/:/g, ''));
}

function bigIntToIPv6(big) {
    let hex = big.toString(16).padStart(32, '0');
    let parts = [];
    
    for (let i = 0; i < 32; i += 4) {
        parts.push(parseInt(hex.substring(i, i + 4), 16).toString(16));
    }
    
    let s = parts.join(':');
    
    let longestRun = 0;
    let longestIndex = -1;
    let currentRun = 0;
    let currentIndex = -1;

    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === '0') {
            if (currentIndex === -1) {
                currentIndex = i;
            }
            currentRun++;
        } else {
            if (currentRun > longestRun) {
                longestRun = currentRun;
                longestIndex = currentIndex;
            }
            currentRun = 0;
            currentIndex = -1;
        }
    }
    
    if (currentRun > longestRun) {
        longestRun = currentRun;
        longestIndex = currentIndex;
    }

    if (longestRun > 1) { 
        parts.splice(longestIndex, longestRun, '');
        s = parts.join(':');
        
        if (longestIndex === 0) {
            s = ':' + s;
        }
        if (longestIndex + longestRun === 8) {
            s = s + ':';
        }
    }
    
    return s;
}

function validarIPv6(ip) {
  const parts = ip.split(':');
  if (ip.includes(':::')) return false; 
  if (ip === '::') return true; 
  if (ip.includes('::')) {
      return parts.length < 9; 
  }
  return parts.length === 8 && parts.every(part => part.length <= 4 && /^[0-9a-fA-F]*$/.test(part));
}

function calcularSubredeIPv6(ip, cidr) {
  const fullIP = expandIPv6(ip); 
  const ipInt = ipv6ToBigInt(ip); 
  
  const mask = (BigInt(2) ** BigInt(128) - BigInt(1)) ^ (BigInt(2) ** (BigInt(128) - BigInt(cidr)) - BigInt(1));
  const networkBigInt = ipInt & mask; 
  const totalIPs = BigInt(2) ** BigInt(128 - cidr);
  const lastIPBigInt = networkBigInt + totalIPs - BigInt(1);

  // --- LÓGICA DA ZONA REVERSA ---
  const fullNetworkHex = networkBigInt.toString(16).padStart(32, '0');
  const reversedNibbles = fullNetworkHex.split('').reverse().join('.');
  const reverseZone = `${reversedNibbles}.ip6.arpa.`;
  // --- FIM DA LÓGICA ---

  return {
    ipAddress: `${ip}/${cidr}`,
    fullIPAddress: fullIP, 
    totalIPAddresses: totalIPs.toLocaleString(),
    network: bigIntToIPv6(networkBigInt),
    ipRange: `${bigIntToIPv6(networkBigInt)} - ${bigIntToIPv6(lastIPBigInt)}`,
    reverseZone: reverseZone 
  };
}

// --- PARTE 3: A LÓGICA DE DIVISÃO ---
function dividirPrefixoIPv6(prefix, prefixLength, newPrefixLength) {
    if (newPrefixLength <= prefixLength) {
        throw new Error("O novo prefixo (Dividir em) deve ser maior que o original.");
    }

    const base = ipv6ToBigInt(expandIPv6(prefix));
    const totalSubnets = 2n ** (BigInt(newPrefixLength) - BigInt(prefixLength));
    const step = 2n ** (128n - BigInt(newPrefixLength));
    const subnets = [];
    
    const mask = (BigInt(2) ** BigInt(128) - BigInt(1)) ^ (BigInt(2) ** (BigInt(128) - BigInt(prefixLength)) - BigInt(1));
    const networkBase = base & mask;

    for (let i = 0n; i < totalSubnets; i++) {
        const subnet = networkBase + (i * step);
        subnets.push(bigIntToIPv6(subnet) + "/" + newPrefixLength);
    }

    return subnets;
}


// --- PARTE 4: O EVENTO DE SUBMIT (COM LÓGICA CSV) ---
form.addEventListener('submit', function(e) {
  e.preventDefault();
  const ip = ipInput.value.trim();
  const cidr = parseInt(cidrInput.value, 10);
  
  const newCidr = newCidrInput ? parseInt(newCidrInput.value, 10) : NaN; 

  output.innerHTML = '';

  if (toggle.checked) {
    // IPv6
    if (!validarIPv6(ip)) {
      output.innerHTML = '<p style="color:red;">IP inválido! Certifique-se de usar o formato correto (ex: 2001:db8::1)</p>';
      return;
    }
    if (isNaN(cidr) || cidr < 1 || cidr > 128) {
      output.innerHTML = '<p style="color:red;">CIDR inválido! Para IPv6, insira um valor entre 1 e 128.</p>';
      return;
    }
    
    // --- LÓGICA DE DIVISÃO (Se "Dividir em" estiver preenchido) ---
    if (!isNaN(newCidr)) {
      if (newCidr <= cidr) {
        output.innerHTML = '<p style="color:red;">O novo prefixo (Dividir em) deve ser maior que o CIDR original.</p>';
        return;
      }
      if (newCidr > 128) {
        output.innerHTML = '<p style="color:red;">O novo prefixo (Dividir em) não pode ser maior que 128.</p>';
        return;
      }
      try {
        const subnets = dividirPrefixoIPv6(ip, cidr, newCidr);
        
        const maxToShow = 999; 
        const tooMany = subnets.length > maxToShow;
        const truncatedSubnets = subnets.slice(0, maxToShow);
        
        const fileName = `subredes_${ip.replace(/:/g, '_')}_${cidr}-para-${newCidr}.csv`;

        output.innerHTML = `
          <div class="results-header">
            <p><b>Prefixo base:</b> ${ip}/${cidr}</p>
            <div class="total-and-download">
              <p><b>Total de sub-redes /${newCidr}:</b> ${subnets.length.toLocaleString()}</p>
              <button id="downloadCsvBtn" class="download-btn">Baixar .CSV Completo</button>
            </div>
          </div>
          
          <div class="results-grid">
              ${truncatedSubnets.map(s => `
                <div class="result-item">
                  <span>${s.split('/')[0]}</span>
                </div>
              `).join('')}
          </div>
          
          ${tooMany ? `<p style="text-align:center; margin-top:15px;"><i>... e mais ${subnets.length - maxToShow} redes (exibição limitada a ${maxToShow}).</i></p>` : ''}
        `;

        document.getElementById('downloadCsvBtn').addEventListener('click', () => {
          downloadCSV(subnets, fileName);
        });

      } catch (err) {
        output.innerHTML = `<p style="color:red;">Erro ao dividir prefixo: ${err.message}</p>`;
      }
    
    } else {
      // --- LÓGICA DE CÁLCULO ÚNICO (Se "Dividir em" estiver vazio) ---
      
      // --- MUDANÇA AQUI: Readicionada a classe 'full-width' ---
      try {
        const dados = calcularSubredeIPv6(ip, cidr);
        
        output.innerHTML = `
          <div class="results-grid">
            <div class="result-item">
              <strong>Network:</strong>
              <span>${dados.network}</span>
            </div>
            <div class="result-item">
              <strong>Total IPs:</strong>
              <span>${dados.totalIPAddresses}</span>
            </div>
            <div class="result-item">
              <strong>IP Address:</strong>
              <span>${dados.ipAddress}</span>
            </div>

            <div class="result-item full-width">
              <strong>Zona Reversa (rDNS):</strong>
              <span>${dados.reverseZone}</span>
            </div>

            <div class="result-item full-width">
              <strong>Full IP Address:</strong>
              <span>${dados.fullIPAddress}</span>
            </div>

            <div class="result-item full-width">
              <strong>IP Range:</strong>
              <span>${dados.ipRange}</span>
            </div>
          </div>
        `;
      } catch (err) {
        output.innerHTML = `<p style="color:red;">Erro ao calcular IPv6. Verifique o endereço e o CIDR: ${err.message}</p>`;
      }
    }
  } else {
    // IPv4
    if (!validarIPv4(ip)) {
      output.innerHTML = '<p style="color:red;">IP inválido! Certifique-se de usar o formato correto (ex: 192.168.0.1)</p>';
      return;
    }
    if (isNaN(cidr) || cidr < 1 || cidr > 32) {
      output.innerHTML = '<p style="color:red;">CIDR inválido! Para IPv4, insira um valor entre 1 e 32.</p>';
      return;
    }
    const dados = calcularSubredeIPv4(ip, cidr);
    
    output.innerHTML = `
      <div class="results-grid">
        <div class="result-item">
          <strong>Network:</strong>
          <span>${dados.network}</span>
        </div>
        <div class="result-item">
          <strong>First Host:</strong>
          <span>${dados.firstHost}</span>
        </div>
        <div class="result-item">
          <strong>Last Host:</strong>
          <span>${dados.lastHost}</span>
        </div>
        <div class="result-item">
          <strong>Subnet Mask:</strong>
          <span>${dados.subnetMask}</span>
        </div>
        <div class="result-item">
          <strong>Broadcast:</strong>
          <span>${dados.broadcast}</span>
        </div>
        <div class="result-item">
          <strong>Valid Hosts:</strong>
          <span>${dados.validHosts}</span>
        </div>
      </div>
    `;
  }
});

// Inicialização visual na primeira carga
updateCIDRForVersion();


// --- FUNÇÃO DE DOWNLOAD ---
function downloadCSV(subnetArray, fileName) {
  let csvContent = "data:text/csv;charset=utf-8,Rede\r\n"; 
  
  subnetArray.forEach(row => {
    csvContent += row.split('/')[0] + "\r\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", fileName);
  document.body.appendChild(link); 
  
  link.click(); 
  
  document.body.removeChild(link); 
}