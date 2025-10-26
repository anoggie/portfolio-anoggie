function expandIPv6(address) {
    let parts = address.split('::');
    let left = parts[0] ? parts[0].split(':') : [];
    let right = parts[1] ? parts[1].split(':') : [];
    let missing = 8 - (left.length + right.length);
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
        parts.push(hex.substring(i, i + 4));
    }
    return parts.join(':').replace(/(^|:)0{1,3}/g, '$1').replace(/((^|:)0)+(?=:|$)/g, '::');
}

function calcularSubredeIPv6(ip, cidr) {
    const fullIP = expandIPv6(ip);
    const ipInt = ipv6ToBigInt(ip);

    const mask = (BigInt(2) ** BigInt(128) - BigInt(1)) ^ (BigInt(2) ** BigInt(128 - cidr) - BigInt(1));
    const networkBigInt = ipInt & mask;
    const totalIPs = BigInt(2) ** BigInt(128 - cidr);
    const lastIPBigInt = networkBigInt + totalIPs - BigInt(1);

    return {
        ipAddress: `${ip}/${cidr}`,
        fullIPAddress: fullIP,
        totalIPAddresses: totalIPs.toLocaleString(),
        network: bigIntToIPv6(networkBigInt),
        ipRange: `${bigIntToIPv6(networkBigInt)} - ${bigIntToIPv6(lastIPBigInt)}`
    };
}

// --- NOVA FUNÇÃO: SPLIT DE PREFIXO (/48 -> /64, etc) ---
function dividirPrefixoIPv6(prefix, prefixLength, newPrefixLength) {
    if (newPrefixLength <= prefixLength) {
        throw new Error("O novo prefixo deve ser maior que o original (ex: /48 → /64).");
    }

    const base = ipv6ToBigInt(expandIPv6(prefix));
    const totalSubnets = 2n ** BigInt(newPrefixLength - prefixLength);
    const step = 2n ** (128n - BigInt(newPrefixLength));
    const subnets = [];

    for (let i = 0n; i < totalSubnets; i++) {
        const subnet = base + (i * step);
        subnets.push(bigIntToIPv6(subnet) + "/" + newPrefixLength);
    }

    return subnets;
}

// --- Integração com a UI ---
document.getElementById('cidrForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const ip = document.getElementById('ip').value.trim();
    const cidr = parseInt(document.getElementById('cidr').value);
    const newCidrField = document.getElementById('newCidr');
    const output = document.getElementById('resultados');
    output.innerHTML = '';

    if (!ip.includes(':')) {
        output.innerHTML = '<p style="color:red;">IP inválido! Use o formato IPv6 (ex: 2001:db8::1)</p>';
        return;
    }

    try {
        // Se o campo de divisão estiver preenchido, gera sub-redes
        if (newCidrField && newCidrField.value) {
            const newCidr = parseInt(newCidrField.value);
            const subnets = dividirPrefixoIPv6(ip, cidr, newCidr);
            output.innerHTML = `
                <p><b>Prefixo base:</b> ${ip}/${cidr}</p>
                <p><b>Total de sub-redes:</b> ${subnets.length.toLocaleString()}</p>
                <ul style="max-height:300px;overflow:auto;">
                    ${subnets.map(s => `<li>${s}</li>`).join('')}
                </ul>
            `;
            return;
        }

        // Caso contrário, apenas calcula a sub-rede
        const dados = calcularSubredeIPv6(ip, cidr);
        output.innerHTML = `
            <table>
                <tr><td>IP Address:</td><td>${dados.ipAddress}</td></tr>
                <tr><td>Full IP Address:</td><td>${dados.fullIPAddress}</td></tr>
                <tr><td>Total IP Addresses:</td><td>${dados.totalIPAddresses}</td></tr>
                <tr><td>Network:</td><td>${dados.network}</td></tr>
                <tr><td>IP Range:</td><td>${dados.ipRange}</td></tr>
            </table>
        `;
    } catch (e) {
        output.innerHTML = `<p style='color:red;'>${e.message}</p>`;
    }
});


