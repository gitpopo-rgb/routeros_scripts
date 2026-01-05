import siteList from './site-list.mjs';
import fs from 'fs';
import path from 'path';

/**
 * 读取配置文件并解析规则
 */
function parseRuleFile(filePath, siteName) {
    if (!fs.existsSync(filePath)) {
        console.error(`配置文件不存在: ${filePath}`);
        return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const rules = {
        domains: new Set(),
        domainSuffixes: new Set(),
        ipCidrs: new Set(),
        ipCidr6s: new Set()
    };

    lines.forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;

        if (line.startsWith('DOMAIN,')) {
            const domain = line.substring(7).trim();
            if (domain) rules.domains.add(domain);
        } else if (line.startsWith('DOMAIN-SUFFIX,')) {
            const domain = line.substring(14).trim();
            if (domain) rules.domainSuffixes.add(domain);
        } else if (line.startsWith('IP-CIDR,')) {
            const cidr = line.substring(8).split(',')[0].trim();
            if (cidr) rules.ipCidrs.add(cidr);
        } else if (line.startsWith('IP-CIDR6,')) {
            const cidr = line.substring(9).split(',')[0].trim();
            if (cidr) rules.ipCidr6s.add(cidr);
        }
    });

    return rules;
}

/**
 * 生成 RouterOS DNS 静态解析脚本
 */
function generateDnsScript(domain, matchSubdomain, comment) {
    return `/ip dns static add name=${domain} type=FWD forward-to=$vpn_dns_server address-list=auto_proxy_list match-subdomain=${matchSubdomain} comment="vpn-dns: ${comment}"`;
}

/**
 * 生成 RouterOS IP address-list 脚本
 */
function generateAddressListScript(address, comment) {
    return `/ip firewall address-list add address=${address} comment="vpn: ${comment}" list=auto_proxy_list`;
}

/**
 * 生成清理脚本
 */
function generateCleanScript() {
    return [
        '# 清理自动代理规则',
        '/ip dns static remove [find comment~"vpn-dns:"]',
        '/ip firewall address-list remove [find list="auto_proxy_list"]',
        ''
    ].join('\n');
}

/**
 * 主函数
 */
function main() {
    console.log('开始生成 RouterOS 脚本...\n');

    const allRules = {
        domains: new Set(),
        domainSuffixes: new Set(),
        ipCidrs: new Set(),
        ipCidr6s: new Set()
    };

    const siteComments = new Map(); // 用于记录每个规则对应的站点

    // 处理每个站点
    for (const site of siteList) {
        const configPath = path.join(
            process.cwd(),
            'ios_rule_script',
            'rule',
            'Clash',
            site,
            `${site}.list`
        );

        console.log(`处理站点: ${site}`);
        console.log(`配置文件: ${configPath}`);

        const rules = parseRuleFile(configPath, site);
        if (!rules) {
            console.log(`跳过站点: ${site}\n`);
            continue;
        }

        // 合并规则并记录来源
        rules.domains.forEach(domain => {
            allRules.domains.add(domain);
            if (!siteComments.has(`domain:${domain}`)) {
                siteComments.set(`domain:${domain}`, site);
            }
        });

        rules.domainSuffixes.forEach(domain => {
            allRules.domainSuffixes.add(domain);
            if (!siteComments.has(`suffix:${domain}`)) {
                siteComments.set(`suffix:${domain}`, site);
            }
        });

        rules.ipCidrs.forEach(cidr => {
            allRules.ipCidrs.add(cidr);
            if (!siteComments.has(`cidr:${cidr}`)) {
                siteComments.set(`cidr:${cidr}`, site);
            }
        });

        rules.ipCidr6s.forEach(cidr => {
            allRules.ipCidr6s.add(cidr);
            if (!siteComments.has(`cidr6:${cidr}`)) {
                siteComments.set(`cidr6:${cidr}`, site);
            }
        });

        console.log(`  - DOMAIN: ${rules.domains.size}`);
        console.log(`  - DOMAIN-SUFFIX: ${rules.domainSuffixes.size}`);
        console.log(`  - IP-CIDR: ${rules.ipCidrs.size}`);
        console.log(`  - IP-CIDR6: ${rules.ipCidr6s.size}\n`);
    }

    // 生成脚本
    const scripts = [];
    scripts.push('# RouterOS 自动代理规则');
    scripts.push('# 生成时间: ' + new Date().toISOString());
    scripts.push('# 站点列表: ' + siteList.join(', '));
    scripts.push('');
    scripts.push('# DNS 静态解析规则');
    scripts.push('');

    // DOMAIN 规则
    console.log('生成 DOMAIN 规则...');
    const sortedDomains = Array.from(allRules.domains).sort();
    sortedDomains.forEach(domain => {
        const comment = siteComments.get(`domain:${domain}`);
        scripts.push(generateDnsScript(domain, 'no', comment));
    });

    scripts.push('');
    scripts.push('# DOMAIN-SUFFIX 规则');
    scripts.push('');

    // DOMAIN-SUFFIX 规则
    console.log('生成 DOMAIN-SUFFIX 规则...');
    const sortedSuffixes = Array.from(allRules.domainSuffixes).sort();
    sortedSuffixes.forEach(domain => {
        const comment = siteComments.get(`suffix:${domain}`);
        scripts.push(generateDnsScript(domain, 'yes', comment));
    });

    scripts.push('');
    scripts.push('# IP 地址列表规则');
    scripts.push('');

    // IP-CIDR 规则
    console.log('生成 IP-CIDR 规则...');
    const sortedCidrs = Array.from(allRules.ipCidrs).sort();
    sortedCidrs.forEach(cidr => {
        const comment = siteComments.get(`cidr:${cidr}`);
        scripts.push(generateAddressListScript(cidr, comment));
    });

    // IP-CIDR6 规则
    console.log('生成 IP-CIDR6 规则...');
    const sortedCidr6s = Array.from(allRules.ipCidr6s).sort();
    sortedCidr6s.forEach(cidr => {
        const comment = siteComments.get(`cidr6:${cidr}`);
        scripts.push(generateAddressListScript(cidr, comment));
    });

    // 写入添加规则脚本
    const patchScriptPath = path.join(process.cwd(), 'auto_proxy_patch.rsc');
    fs.writeFileSync(patchScriptPath, scripts.join('\n') + '\n', 'utf-8');
    console.log(`\n生成添加规则脚本: ${patchScriptPath}`);

    // 写入清理脚本
    const cleanScriptPath = path.join(process.cwd(), 'auto_proxy_clean_patch.rsc');
    fs.writeFileSync(cleanScriptPath, generateCleanScript(), 'utf-8');
    console.log(`生成清理规则脚本: ${cleanScriptPath}`);

    // 统计信息
    console.log('\n=== 统计信息 ===');
    console.log(`总计 DOMAIN 规则: ${allRules.domains.size}`);
    console.log(`总计 DOMAIN-SUFFIX 规则: ${allRules.domainSuffixes.size}`);
    console.log(`总计 IP-CIDR 规则: ${allRules.ipCidrs.size}`);
    console.log(`总计 IP-CIDR6 规则: ${allRules.ipCidr6s.size}`);
    console.log(`总计规则数: ${allRules.domains.size + allRules.domainSuffixes.size + allRules.ipCidrs.size + allRules.ipCidr6s.size}`);
    console.log('\n脚本生成完成!');
}

// 运行主函数
main();
