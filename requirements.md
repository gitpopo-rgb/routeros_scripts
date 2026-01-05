## 生成RouterOS脚本

1. 生成逻辑
- 从根据已选中的链接中读取链接对应的配置信息。
先将site转换成最终配置文件路径。最终配置文件地址为`ios_rule_script/rule/Clash/${site}/${site}.list`，例如site为`ZhihuAds`的最终配置文件地址为`ios_rule_script/rule/Clash/ZhihuAds/ZhihuAds.list`。得到最终配置地址之后，读取配置内容。
- 将配置信息转换为RouterOS脚本。
配置内容中只需要取`DOMAIN`、`DOMAIN-SUFFIX`、`IP-CIDR`、`IP-CIDR6`开头的行。每行的格式为行前缀+逗号+内容。
- `DOMAIN`开头的行，转为RouterOS静态DNS解析脚本。例如：

```
DOMAIN,voice.telephony.goog
```
转为

```
/ip dns static add name=voice.telephony.goog type=FWD forward-to=$vpn_dns_server address-list=auto_proxy_list match-subdomain=no comment="vpn-dns: Google"
```
- `DOMAIN-SUFFIX`开头的行，转为RouterOS静态DNS解析脚本。例如：

```
DOMAIN-SUFFIX,1e100.net
```
转为

```
/ip dns static add name=1e100.net type=FWD forward-to=$vpn_dns_server address-list=auto_proxy_list match-subdomain=yes comment="vpn-dns: Google"
```

- `IP-CIDR`、`IP-CIDR6`开头的行，转为RouterOS ip address-list脚本。例如：

```
IP-CIDR,74.125.0.0/16,no-resolve
IP-CIDR6,2620:120:e000::/40,no-resolve
```
转为

```
/ip firewall address-list add address=74.125.0.0/16 comment="vpn: Google" list=auto_proxy_list
/ip firewall address-list add address=2620:120:e000::/40 comment="vpn: Google" list=auto_proxy_list
```

配置信息文件示例：
```
# NAME: Google
# AUTHOR: blackmatrix7
# REPO: https://github.com/blackmatrix7/ios_rule_script
# UPDATED: 2025-12-08 02:06:19
# DOMAIN: 1
# DOMAIN-KEYWORD: 5
# DOMAIN-SUFFIX: 691
# IP-CIDR: 4
# IP-CIDR6: 1
# PROCESS-NAME: 6
# TOTAL: 708
DOMAIN,voice.telephony.goog
DOMAIN-SUFFIX,0emm.com
DOMAIN-SUFFIX,1e100.net
DOMAIN-KEYWORD,appspot
DOMAIN-KEYWORD,blogspot
DOMAIN-KEYWORD,gmail
DOMAIN-KEYWORD,google
DOMAIN-KEYWORD,recaptcha
IP-CIDR,172.110.32.0/21,no-resolve
IP-CIDR,173.194.0.0/16,no-resolve
IP-CIDR,216.73.80.0/20,no-resolve
IP-CIDR,74.125.0.0/16,no-resolve
IP-CIDR6,2620:120:e000::/40,no-resolve
PROCESS-NAME,GoogleDriveFS.exe
PROCESS-NAME,com.android.vending
PROCESS-NAME,com.google.android.gms
PROCESS-NAME,com.google.android.gsf
PROCESS-NAME,com.google.android.play.games
PROCESS-NAME,BackupandSync
```
处理过程中需要对其中的域名以及CIDR、CIDR6进行去重，避免生成重复脚本。
2. 将生成配置文件写入auto_proxy_patch.rsc文件中
3. 生成对应的清楚脚本，写入auto_proxy_clean_patch.rsc文件中
4. 验证生成后的脚本语法是否正确。



## github Action
写一个GitHub Action，实现以下步骤
1. 克隆仓库https://github.com/blackmatrix7/ios_rule_script.git到ios_rule_script目录
2. 安装node以及npm，并执行`npm run generate`命令
3. 将生成的`auto_proxy_clean_patch.rsc`以及`auto_proxy_patch.rsc`发布到Release中。
