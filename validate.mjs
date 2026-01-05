import fs from 'fs';
import path from 'path';

/**
 * 验证 RouterOS 脚本语法
 */
function validateScript(filePath) {
    console.log(`\n验证文件: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        console.error(`错误: 文件不存在`);
        return false;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let errors = [];
    let warnings = [];
    let lineNumber = 0;

    for (const line of lines) {
        lineNumber++;
        const trimmed = line.trim();
        
        // 跳过空行和注释
        if (!trimmed || trimmed.startsWith('#')) continue;

        // 检查 DNS 静态解析规则
        if (trimmed.includes('/ip dns static add')) {
            // 检查必需参数
            if (!trimmed.includes('name=')) {
                errors.push(`第 ${lineNumber} 行: 缺少 name 参数`);
            }
            if (!trimmed.includes('type=')) {
                errors.push(`第 ${lineNumber} 行: 缺少 type 参数`);
            }
            if (!trimmed.includes('forward-to=')) {
                errors.push(`第 ${lineNumber} 行: 缺少 forward-to 参数`);
            }
            if (!trimmed.includes('match-subdomain=')) {
                errors.push(`第 ${lineNumber} 行: 缺少 match-subdomain 参数`);
            }

            // 检查 match-subdomain 的值
            const matchSubdomain = trimmed.match(/match-subdomain=(yes|no)/);
            if (!matchSubdomain) {
                errors.push(`第 ${lineNumber} 行: match-subdomain 参数值必须是 yes 或 no`);
            }

            // 检查域名格式
            const nameMatch = trimmed.match(/name=([^\s]+)/);
            if (nameMatch && nameMatch[1].includes('$')) {
                warnings.push(`第 ${lineNumber} 行: 域名包含变量 ${nameMatch[1]}`);
            }
        }

        // 检查 address-list 规则
        if (trimmed.includes('/ip firewall address-list add')) {
            // 检查必需参数
            if (!trimmed.includes('address=')) {
                errors.push(`第 ${lineNumber} 行: 缺少 address 参数`);
            }
            if (!trimmed.includes('list=')) {
                errors.push(`第 ${lineNumber} 行: 缺少 list 参数`);
            }

            // 检查 CIDR 格式
            const addressMatch = trimmed.match(/address=([^\s]+)/);
            if (addressMatch) {
                const address = addressMatch[1];
                // 基础 IPv4 CIDR 验证
                if (address.includes('.') && !address.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/)) {
                    warnings.push(`第 ${lineNumber} 行: IPv4 CIDR 格式可能不正确: ${address}`);
                }
                // 基础 IPv6 CIDR 验证
                if (address.includes(':') && !address.includes('/')) {
                    warnings.push(`第 ${lineNumber} 行: IPv6 地址缺少前缀长度: ${address}`);
                }
            }
        }

        // 检查 remove 命令
        if (trimmed.includes('/ip dns static remove') || 
            trimmed.includes('/ip firewall address-list remove')) {
            if (!trimmed.includes('[find')) {
                warnings.push(`第 ${lineNumber} 行: remove 命令建议使用 [find] 过滤器`);
            }
        }

        // 检查行是否以 /ip 开头（RouterOS 命令）
        if (trimmed.startsWith('/') && !trimmed.startsWith('/ip')) {
            warnings.push(`第 ${lineNumber} 行: 命令不是以 /ip 开头`);
        }
    }

    // 输出结果
    console.log(`\n检查完成:`);
    console.log(`  总行数: ${lineNumber}`);
    console.log(`  命令行数: ${lines.filter(l => l.trim() && !l.trim().startsWith('#')).length}`);
    
    if (errors.length > 0) {
        console.log(`\n发现 ${errors.length} 个错误:`);
        errors.forEach(err => console.log(`  ❌ ${err}`));
    }
    
    if (warnings.length > 0) {
        console.log(`\n发现 ${warnings.length} 个警告:`);
        warnings.forEach(warn => console.log(`  ⚠️  ${warn}`));
    }
    
    if (errors.length === 0 && warnings.length === 0) {
        console.log(`  ✅ 未发现语法错误或警告`);
    }

    return errors.length === 0;
}

/**
 * 主函数
 */
function main() {
    console.log('=== RouterOS 脚本语法验证 ===');
    
    const patchScript = path.join(process.cwd(), 'auto_proxy_patch.rsc');
    const cleanScript = path.join(process.cwd(), 'auto_proxy_clean_patch.rsc');
    
    const patchValid = validateScript(patchScript);
    const cleanValid = validateScript(cleanScript);
    
    console.log('\n=== 验证总结 ===');
    console.log(`auto_proxy_patch.rsc: ${patchValid ? '✅ 通过' : '❌ 失败'}`);
    console.log(`auto_proxy_clean_patch.rsc: ${cleanValid ? '✅ 通过' : '❌ 失败'}`);
    
    if (patchValid && cleanValid) {
        console.log('\n所有脚本验证通过！');
        process.exit(0);
    } else {
        console.log('\n部分脚本验证失败，请检查错误信息。');
        process.exit(1);
    }
}

// 运行验证
main();
