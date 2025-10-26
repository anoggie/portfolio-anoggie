// Função para validar IPv4
function validarIP(ip) {
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

function calcularSubrede(ip, cidr) {
  const ipBin = ipParaBinario(ip);
  const mascaraBin = '1'.repeat(cidr).padEnd(32, '0');

  const redeBin = [...ipBin].map((bit, i) => bit === '1' && mascaraBin[i] === '1' ? '1' : '0').join('');
  const broadcastBin = ipBin.slice(0, cidr) + '1'.repeat(32 - cidr);
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
    CIDR: `/${cidr}`,
    mascara: binarioParaIP(mascaraBin),
    mascara_bin: mascaraBin,
    rede: binarioParaIP(redeBin),
    primeiro_host: primeiroHost,
    ultimo_host: ultimoHost,
    broadcast: binarioParaIP(broadcastBin),
    hosts_validos: hostsValidos
  };
}

// Evento submit do formulário para IPv4
document.getElementById('cidrForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const ip = document.getElementById('ip').value.trim();
  const cidr = parseInt(document.getElementById('cidr').value);
  const output = document.getElementById('resultados');
  output.innerHTML = '';

  if (!validarIP(ip)) {
    output.innerHTML = '<p>IP inválido! Certifique-se de usar o formato correto (ex: 192.168.1.1)</p>';
    return;
  }

  const dados = calcularSubrede(ip, cidr);
  const tabela = `
    <table>
      <caption>Resultados para ${dados.CIDR}</caption>
      <tr><th>Endereço IP</th><td>${ip}</td></tr>
      <tr><th>Máscara</th><td>${dados.mascara} (${dados.CIDR})</td></tr>
      <tr><th>Máscara Binária</th><td>${dados.mascara_bin}</td></tr>
      <tr><th>Rede</th><td>${dados.rede}</td></tr>
      <tr><th>Primeiro Host</th><td>${dados.primeiro_host}</td></tr>
      <tr><th>Último Host</th><td>${dados.ultimo_host}</td></tr>
      <tr><th>Broadcast</th><td>${dados.broadcast}</td></tr>
      <tr><th>Hosts Válidos</th><td>${dados.hosts_validos}</td></tr>
    </table>
  `;
  output.innerHTML = tabela;
});
