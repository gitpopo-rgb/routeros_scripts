# RouterOS 自动代理脚本生成器

这个工具可以从 Clash 规则文件生成 RouterOS 的自动代理脚本。

## 功能特点

- 🔄 自动读取和解析 Clash 规则文件
- 🌐 支持 DOMAIN、DOMAIN-SUFFIX、IP-CIDR、IP-CIDR6 规则类型
- 🔍 自动去重，避免生成重复规则
- ✅ 内置语法验证器
- 🧹 自动生成清理脚本

## 使用方法

### 1. 配置站点列表

编辑 `site-list.mjs` 文件，添加需要处理的站点：

```javascript
export default [
    "1337x",
    "Google",
    "YouTube",
    // 添加更多站点...
];
```

### 2. 生成脚本

运行以下命令生成 RouterOS 脚本：

```bash
npm run generate
```

或者同时生成并验证：

```bash
npm run build
```

### 3. 输出文件

生成的文件：

- `auto_proxy_patch.rsc` - RouterOS 代理规则脚本
- `auto_proxy_clean_patch.rsc` - 清理规则的脚本

### 4. 使用生成的脚本

#### 方法 1: 通过 WinBox/WebFig

1. 登录 RouterOS
2. 打开 System -> Scripts
3. 新建脚本，复制 `auto_proxy_patch.rsc` 的内容
4. 运行脚本

#### 方法 2: 通过 SSH

```bash
# 上传文件到 RouterOS
scp auto_proxy_patch.rsc admin@router:/
scp auto_proxy_clean_patch.rsc admin@router:/

# 登录 RouterOS
ssh admin@router

# 导入并执行脚本
/import auto_proxy_patch.rsc
```

#### 清理规则

如果需要清理所有自动代理规则：

```bash
/import auto_proxy_clean_patch.rsc
```

## 脚本说明

### 生成的规则类型

1. **DNS 静态解析规则**
   - DOMAIN 规则 -> `match-subdomain=no`
   - DOMAIN-SUFFIX 规则 -> `match-subdomain=yes`
   - 自动转发到变量 `$vpn_dns_server` 指定的 DNS 服务器
   - 解析的 IP 地址自动添加到 `auto_proxy_list` 地址列表

2. **IP 地址列表规则**
   - IP-CIDR 和 IP-CIDR6 规则
   - 自动添加到 `auto_proxy_list` 地址列表

### 变量说明

生成的脚本使用以下变量，需要在 RouterOS 中预先定义：

- `$vpn_dns_server` - VPN DNS 服务器地址（例如：8.8.8.8）

### 示例：设置 VPN DNS 服务器

在 RouterOS 中执行：

```routeros
:global vpn_dns_server "8.8.8.8"
```

或者在导入脚本前，在脚本开头添加：

```routeros
:global vpn_dns_server "8.8.8.8"

# ... 其余规则 ...
```

## 开发

### 项目结构

```
.
├── main.mjs                    # 主脚本生成器
├── validate.mjs                # 语法验证器
├── site-list.mjs              # 站点列表配置
├── auto_proxy_patch.rsc       # 生成的代理规则脚本
├── auto_proxy_clean_patch.rsc # 生成的清理脚本
└── ios_rule_script/           # Clash 规则文件目录
```

### 可用命令

```bash
# 生成脚本
npm run generate

# 验证脚本语法
npm run validate

# 生成并验证
npm run build
```

## 规则来源

本项目使用 [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script) 提供的规则文件。

## 注意事项

1. 确保 RouterOS 版本支持所使用的命令
2. 生成的规则数量较多时，导入可能需要一定时间
3. 建议在测试环境先验证脚本
4. 定期更新规则文件以获取最新的域名和 IP 地址

## License

ISC
