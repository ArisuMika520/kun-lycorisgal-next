# LyCorisGAL 生产部署指南

[返回项目主页](../README.md)

本文档介绍生产服务器所需依赖、PostgreSQL 17.0、环境变量、构建、PM2、
Nginx、备份恢复及安全检查。请按顺序执行，并在操作生产数据库前创建可恢复备份。

## 生产部署概览

本文以 Ubuntu 22.04/24.04 x86_64、域名已解析到服务器、应用目录为
`/srv/lycorisgal` 为例。推荐至少准备 2 核 CPU、4 GB 内存和 20 GB 可用磁盘；
Next.js 构建和 Puppeteer 浏览器下载会占用较多内存与空间。

生产流量链路如下：

```text
浏览器 --HTTPS--> Nginx --HTTP--> Next.js/PM2 (127.0.0.1:3000)
                                  |--> PostgreSQL 17.0 (127.0.0.1:5432)
                                  |--> Redis (127.0.0.1:6379)
                                  |--> SMTP / S3 / OAuth 等外部服务
```

必须使用的版本：

- Node.js 22，当前验证版本为 22.18.0
- pnpm 11.1.1，以 `package.json` 的 `packageManager` 字段为准
- PostgreSQL 和 psql 精确为 17.0，不能直接升级到 17.1 或更高版本
- Redis
- Nginx 或其他支持 WebSocket 的反向代理

PM2、Prisma、Next.js 等都是项目依赖，**不要全局安装**，也不要混用 npm、Yarn、
`pnpx`。统一通过 Corepack 和仓库锁定的 pnpm 安装。

## 一、安装系统依赖

先更新系统并安装基础工具、Redis 和 Nginx：

```bash
sudo apt update
sudo apt install -y \
  ca-certificates curl git gnupg openssl unzip build-essential bison flex perl \
  libicu-dev libreadline-dev libssl-dev zlib1g-dev redis-server nginx

sudo systemctl enable --now redis-server nginx
redis-cli ping
```

`redis-cli ping` 应返回 `PONG`。Redis 只能监听回环地址；检查：

```bash
sudo ss -ltnp | grep 6379
```

如果 Redis 设置了 `requirepass`，需要在 `.env` 中同步设置 `REDIS_PASSWORD`。
不要把 6379 暴露到公网。

## 二、安装 Node.js 和 pnpm

以下使用固定版本的 nvm 安装 Node.js。先以实际运行应用的部署用户执行：

```bash
curl -fsSLo /tmp/install-nvm.sh \
  https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh
bash /tmp/install-nvm.sh
rm -f /tmp/install-nvm.sh

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

nvm install 22.18.0
nvm alias default 22.18.0
nvm use 22.18.0

corepack enable
node --version
pnpm --version
```

预期输出为 Node `v22.18.0` 和 pnpm `11.1.1`。第一次运行 pnpm 时 Corepack 会读取
`package.json` 并获取锁定版本，不需要执行 `npm install -g pnpm`。

重新登录后如果找不到 `node` 或 `pnpm`，先确认 shell 启动文件已加载
`$HOME/.nvm/nvm.sh`。不要用 sudo 执行 `pnpm install`，否则 `node_modules`、
Puppeteer 缓存和构建产物会变成 root 所有。

## 三、获取代码和安装项目依赖

```bash
sudo install -d -o "$USER" -g "$USER" /srv/lycorisgal
git clone https://github.com/ArisuMika520/kun-lycorisgal-next.git \
  /srv/lycorisgal
cd /srv/lycorisgal

git switch main
pnpm install --frozen-lockfile
```

依赖安装注意事项：

- 必须保留 `--frozen-lockfile`，确保服务器使用已经审计的准确依赖树。
- 不能使用 `pnpm install --prod` 构建：TypeScript、Tailwind、Prisma CLI 等构建工具
  位于开发依赖中。构建完成后也不要手动删 `node_modules`，standalone 外部包和 PM2
  仍可能需要它。
- `postinstall` 会自动运行 `prisma generate`；不要再使用 `pnpx prisma`。
- PM2 已固定在项目依赖中，使用 `pnpm exec pm2`，不要全局安装另一个版本。
- Puppeteer 的安装脚本会下载数百 MB 的 Chrome for Testing；确保部署用户的
  `$HOME/.cache/puppeteer` 可写且磁盘充足。
- `pnpm-workspace.yaml` 只允许清单中的依赖执行安装脚本，不要随意运行
  `pnpm approve-builds` 放开未知包。
- `.npmrc` 设置了新版本依赖的最小发布时间。正常冻结锁文件安装不受影响；更新依赖
  时如果包刚发布不足 7 天，应等待观察期结束，而不是删除该安全设置。

检查 Prisma、Sharp 和 Puppeteer 是否已正确安装：

```bash
pnpm exec prisma --version
node -e "require('sharp'); console.log('sharp ok')"
pnpm exec puppeteer browsers list
```

只有蜘蛛抓取或性能测试功能需要启动浏览器。如果 Puppeteer 报
`Could not find Chrome`，运行：

```bash
pnpm exec puppeteer browsers install chrome
```

如果报缺少 Linux 动态库，按照
[Puppeteer Linux 故障排查](https://pptr.dev/troubleshooting) 安装对应系统包。不要通过
`--no-sandbox` 绕过 Chrome 沙箱。

## 四、配置生产环境变量

创建生产配置并限制权限：

```bash
cp .env.example .env
chmod 600 .env
openssl rand -hex 32
openssl rand -base64 64
```

将生成值分别用于数据库密码和 `JWT_SECRET`，然后编辑 `.env`。至少核对以下分组：

### 应用地址

```dotenv
NODE_ENV="production"
HOSTNAME="127.0.0.1"
KUN_VISUAL_NOVEL_SITE_URL="https://gal.example.com"
NEXT_PUBLIC_KUN_PATCH_ADDRESS_PROD="https://gal.example.com"
KUN_OAUTH_REDIRECT_URI="https://gal.example.com/api/auth/oauth/kun/callback"
```

`NEXT_PUBLIC_KUN_PATCH_ADDRESS_PROD` 是浏览器请求 Next.js API 的公开站点来源：

- 必须是浏览器真正能够访问的 HTTPS 域名。
- 不能在远程部署中填写 `127.0.0.1` 或 `localhost`，它们指向访问者自己的电脑。
- 不能填写图片 CDN、S3 或图床地址。
- 地址与当前页面不同源时还需要额外配置 CORS；本项目推荐与站点同源。
- 所有 `NEXT_PUBLIC_*` 值都会在 `pnpm build` 时写入客户端 JS。修改后必须重新
  build，仅重启 PM2 不会生效。

### PostgreSQL 和 Redis

```dotenv
POSTGRES_DB="lycorisgal"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="使用刚生成的十六进制强密码"
POSTGRES_PORT="5432"
KUN_DATABASE_URL="postgresql://postgres:同一个密码@127.0.0.1:5432/lycorisgal?schema=public"

REDIS_HOST="127.0.0.1"
REDIS_PORT="6379"
REDIS_PASSWORD=""
```

建议数据库密码使用 `openssl rand -hex 32` 生成，避免 URL 中的特殊字符需要百分号
编码。若使用了包含 `@`、`:`、`/`、`?` 等字符的密码，必须先对密码部分做 URL 编码。

### 其他外部服务

- JWT：`JWT_ISS`、`JWT_AUD`、至少 32 字符且从未提交过的 `JWT_SECRET`。
- OAuth：客户端 ID、Secret、服务端地址和与 OAuth 平台完全一致的回调地址。
- SMTP：主机、端口、账号、密码和发件人；587 通常使用 STARTTLS，不要误配成
  隐式 TLS。
- S3：Access Key、Secret、Bucket、Endpoint、Region 和公开 CDN 地址。
- 图床：`KUN_VISUAL_NOVEL_IMAGE_BED_HOST` 只填写主机名，不带 `https://` 和路径；
  URL 字段填写完整 HTTPS 地址。
- Cloudflare、IndexNow、DLsite、Steam 等未启用功能可以保留空值，但不要保留示例
  凭据。
- 正式站点应删除或留空 `KUN_VISUAL_NOVEL_TEST_SITE_LABEL`，否则会禁止搜索引擎
  索引。

`.env` 已被 Git 忽略，不能将它复制到 `public/`、提交到仓库或随备份公开分发。

## 五、原生安装 PostgreSQL 17.0

为兼容现有备份，服务端和 psql 都必须精确保持 **17.0**。发行版仓库和 PGDG 仓库
通常只提供 17 系列的最新补丁版，因此不能直接执行 `apt install postgresql-17`。
这里使用 [PostgreSQL 官方 17.0 源码](https://www.postgresql.org/ftp/source/v17.0/)
构建，并安装到独立的 `/opt/postgresql-17.0`，避免系统包升级将其替换。

### 下载、校验和编译

以普通部署用户编译，不要用 root 运行 `configure`、`make` 或 `make check`：

```bash
cd /tmp
curl -fSLO \
  https://ftp.postgresql.org/pub/source/v17.0/postgresql-17.0.tar.bz2
curl -fSLO \
  https://ftp.postgresql.org/pub/source/v17.0/postgresql-17.0.tar.bz2.sha256
sha256sum --check postgresql-17.0.tar.bz2.sha256

tar -xjf postgresql-17.0.tar.bz2
cd postgresql-17.0

./configure \
  --prefix=/opt/postgresql-17.0 \
  --with-openssl \
  --with-icu
make -j"$(nproc)"
make check
sudo make install
```

将 17.0 客户端工具加入系统 PATH，并立即验证版本：

```bash
sudo tee /etc/profile.d/postgresql-17.0.sh >/dev/null <<'EOF'
export PATH="/opt/postgresql-17.0/bin:$PATH"
EOF

export PATH="/opt/postgresql-17.0/bin:$PATH"
postgres --version
psql --version
```

两条命令都必须显示 `17.0`。不要创建指向系统其他 PostgreSQL 版本的通用软链接。

### 创建数据库用户和数据目录

```bash
getent passwd postgres >/dev/null || \
  sudo useradd --system --create-home --home-dir /var/lib/postgresql \
    --shell /usr/sbin/nologin postgres

sudo install -d -o postgres -g postgres -m 0700 \
  /var/lib/postgresql/17.0/data
sudo install -d -o postgres -g postgres -m 0750 \
  /var/log/postgresql-17.0

sudo -u postgres /opt/postgresql-17.0/bin/initdb \
  --pgdata=/var/lib/postgresql/17.0/data \
  --encoding=UTF8 \
  --locale=C.UTF-8 \
  --auth-local=peer \
  --auth-host=scram-sha-256
```

让 PostgreSQL 仅监听本机，并使用 systemd 创建的 socket 目录：

```bash
sudo -u postgres tee -a \
  /var/lib/postgresql/17.0/data/postgresql.conf >/dev/null <<'EOF'
listen_addresses = '127.0.0.1'
port = 5432
unix_socket_directories = '/run/postgresql'
password_encryption = 'scram-sha-256'
EOF
```

`initdb --auth-host=scram-sha-256` 已为 TCP 连接生成对应的 `pg_hba.conf` 规则。不要
添加 `trust` 形式的远程规则，也不要将 `listen_addresses` 改为 `0.0.0.0`。

### 创建 systemd 服务

```bash
sudo tee /etc/systemd/system/postgresql-17.0.service >/dev/null <<'EOF'
[Unit]
Description=PostgreSQL 17.0 database server
After=network.target

[Service]
Type=forking
User=postgres
Group=postgres
RuntimeDirectory=postgresql
RuntimeDirectoryMode=0755
PIDFile=/var/lib/postgresql/17.0/data/postmaster.pid
ExecStart=/opt/postgresql-17.0/bin/pg_ctl start -D /var/lib/postgresql/17.0/data -s -w -t 300 -l /var/log/postgresql-17.0/postgresql.log
ExecStop=/opt/postgresql-17.0/bin/pg_ctl stop -D /var/lib/postgresql/17.0/data -s -m fast -w -t 300
ExecReload=/opt/postgresql-17.0/bin/pg_ctl reload -D /var/lib/postgresql/17.0/data -s
TimeoutStartSec=300
TimeoutStopSec=300
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now postgresql-17.0
sudo systemctl status postgresql-17.0 --no-pager
```

首次安装时，为数据库超级用户设置强密码并创建应用数据库：

```bash
sudo -u postgres /opt/postgresql-17.0/bin/psql \
  --host=/run/postgresql --dbname=postgres --command='\password postgres'
sudo -u postgres /opt/postgresql-17.0/bin/createdb \
  --host=/run/postgresql --owner=postgres lycorisgal
```

`\password` 会交互式读取密码，不会把密码写入 shell 历史。该密码必须与 `.env` 中
`POSTGRES_PASSWORD` 和 `KUN_DATABASE_URL` 使用的密码一致。

最后检查本地监听和应用连接：

```bash
/opt/postgresql-17.0/bin/pg_isready \
  --host=127.0.0.1 --port=5432 --dbname=lycorisgal
ss -ltnp | grep 5432
pnpm db:check-version
```

源码版 17.0 不会随 `apt upgrade` 获得 PostgreSQL 安全补丁。完成备份迁移前应限制
网络入口、持续扫描并记录风险接受；迁移完成后再单独规划 PostgreSQL 补丁升级。

### 新数据库初始化

```bash
pnpm prisma:push
```

`prisma db push` 会直接同步 schema，不等同于可回滚 migration。已有生产数据时必须
先备份、在测试数据库验证 schema 变化，再执行该命令。

### 恢复 PostgreSQL 17.0 备份

恢复脚本支持纯 SQL 和 `pg_dump` 自定义格式。目标数据库应为空：

```bash
POSTGRES_PASSWORD="数据库密码" \
  scripts/restorePostgres17.sh /absolute/path/to/backup.dump

pnpm db:check-version
pnpm prisma:push
```

脚本直接使用 `/opt/postgresql-17.0/bin/psql` 和 `pg_restore`，并在导入前同时拒绝
非 17.0 客户端或服务端。它不会自动清空已有数据库，禁止对包含有效数据的目标库
重复恢复。非默认地址可通过 `POSTGRES_HOST`、`POSTGRES_PORT`、`POSTGRES_DB` 和
`POSTGRES_USER` 覆盖。

## 六、构建应用

```bash
pnpm typecheck
pnpm audit --prod
pnpm build
```

成功后应存在 `.next/standalone/server.js`。构建后脚本会复制 `public`、静态资源、
文章和验证码图片，并删除 standalone 中可能被 Next.js 追踪进去的 `.env*`：

```bash
test -f .next/standalone/server.js
find .next/standalone -maxdepth 1 -name '.env*' -print
```

第二条命令不应输出任何文件。如果构建因内存不足退出，可临时增加 Node 构建堆：

```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm build
```

`postbuild` 会重新生成 `public/sitemap.xml`，所以构建后 `git status` 可能出现该文件
变化。不要在生产服务器提交自动生成内容；更新代码前先检查它是否会与远端修改冲突。

## 七、使用 PM2 启动

```bash
pnpm start
pnpm exec pm2 status
pnpm exec pm2 logs kun-touchgal-next --lines 100 --nostream
curl --fail --show-error http://127.0.0.1:3000/
```

`pnpm start` 会通过 `ecosystem.config.cjs` 启动或平滑重载两个 cluster 实例。应用只监听
`127.0.0.1:3000`，由 Nginx 对外提供服务。

配置开机启动：

```bash
pnpm exec pm2 save
pnpm exec pm2 startup
```

`pm2 startup` 会打印一条带 `sudo` 的命令；以部署用户执行它打印的完整命令，再次
执行 `pnpm exec pm2 save`。验证状态：

```bash
pnpm exec pm2 status
pnpm exec pm2 ping
```

停止应用使用 `pnpm stop`。不要同时用全局 PM2 和项目 PM2 管理同名进程。

## 八、配置 Nginx 和 HTTPS

创建 `/etc/nginx/sites-available/lycorisgal`，将域名替换为实际值：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name gal.example.com;

    client_max_body_size 512m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

启用并检查配置：

```bash
sudo ln -s /etc/nginx/sites-available/lycorisgal \
  /etc/nginx/sites-enabled/lycorisgal
sudo nginx -t
sudo systemctl reload nginx
```

确认 HTTP 可用后再使用受信任证书。Ubuntu 可以使用 Certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d gal.example.com
sudo certbot renew --dry-run
```

只开放 SSH、80 和 443。3000、5432、6379 都应保持仅本机访问，并同时核对
`ss -ltnp`、UFW 和云服务商安全组。

## 九、后续更新部署

每次更新前先完成数据库、`.env` 和 `uploads/` 备份，并查看工作区：

```bash
cd /srv/lycorisgal
git status --short
git pull --ff-only
pnpm install --frozen-lockfile
pnpm db:check-version
pnpm prisma:push
pnpm typecheck
pnpm build
pnpm start
```

依赖有变化时不能省略 `pnpm install --frozen-lockfile`。PM2 的
`startOrReload --update-env` 会在新实例准备好后替换旧实例。

仓库也提供自动化脚本：

```bash
pnpm deploy:install
pnpm deploy:build
```

- `deploy:install`：冻结锁文件安装、PostgreSQL 版本检查、Prisma schema 同步和上传
  目录权限设置。
- `deploy:build`：校验 `.env`、执行 `git pull --ff-only`、检查数据库版本、同步
  schema、构建并平滑重载 PM2。
- `deploy:build` 本身不安装新依赖；`package.json` 或 `pnpm-lock.yaml` 有变化时，应
  先运行 `pnpm deploy:install`。
- 自动脚本会修改数据库 schema，运行前仍需人工确认备份可恢复。

## 十、备份与恢复

创建仅部署用户可读的备份目录：

```bash
install -d -m 700 /srv/lycorisgal-backups
read -rsp 'PostgreSQL password: ' PGPASSWORD
echo
export PGPASSWORD
/opt/postgresql-17.0/bin/pg_dump \
  --host=127.0.0.1 --port=5432 \
  --username=postgres --dbname=lycorisgal --no-password --format=custom \
  > "/srv/lycorisgal-backups/lycorisgal-$(date +%F-%H%M%S).dump"
unset PGPASSWORD
```

还应备份：

- `.env`，必须加密保存并限制访问权限。
- `uploads/`，其中包含本地上传文件。
- Nginx 配置和其他定时任务配置。

备份必须定期复制到不同机器或对象存储，并周期性在隔离的 PostgreSQL 17.0 实例中
执行恢复演练。只生成备份但从未验证恢复不算有效备份。

## 十一、常见问题

### 页面一直显示“正在获取 Galgame 资源数据...”

检查浏览器 Network/Console。最常见原因是构建时把
`NEXT_PUBLIC_KUN_PATCH_ADDRESS_PROD` 设置成了 `127.0.0.1`、`localhost`、图片 CDN
或错误域名。修正为站点公开 HTTPS 来源后，必须重新执行 `pnpm build && pnpm start`。

服务端 API 可单独检查：

```bash
curl --fail --show-error \
  'http://127.0.0.1:3000/api/patch/resource?patchId=1'
```

### `pnpm` 或 Corepack 找不到

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 22.18.0
corepack enable
pnpm --version
```

不要通过全局 npm 安装另一个 pnpm 版本覆盖 Corepack shim。

### Prisma 无法连接数据库

```bash
sudo systemctl status postgresql-17.0 --no-pager
sudo journalctl -u postgresql-17.0 --since '15 minutes ago' --no-pager
/opt/postgresql-17.0/bin/pg_isready \
  --host=127.0.0.1 --port=5432 --dbname=lycorisgal
pnpm db:check-version
```

检查 URL 密码是否已编码、端口是否一致，以及 `.env` 是否由当前部署用户读取。

### Redis `ECONNREFUSED` 或 TLS 错误

```bash
redis-cli -h 127.0.0.1 -p 6379 ping
sudo systemctl status redis-server
```

本机普通 Redis 使用非 TLS 连接。不要把普通 Redis 端口误当成 TLS 端口。

### PM2 启动但网站无法访问

```bash
pnpm exec pm2 status
pnpm exec pm2 logs kun-touchgal-next --lines 200 --nostream
ss -ltnp | grep 3000
curl -v http://127.0.0.1:3000/
sudo nginx -t
```

如果出现 `EADDRINUSE`，确认没有另一个 Node/PM2 实例占用 3000，不要直接杀死不明
进程。

### 上传失败或 413

检查 Nginx 的 `client_max_body_size`、`uploads/` 所有者和权限。首次安装脚本会将
`uploads/` 设置为 `0770`；运行 PM2 的用户必须对该目录有读写权限。

## 十二、安全检查和上线清单

```bash
pnpm audit --prod
pnpm typecheck
trivy fs --scanners vuln,misconfig,secret \
  --skip-dirs node_modules --skip-dirs .next --skip-files .env .
```

上线前确认：

- `.env` 权限为 `0600`，所有示例密码和上游默认 JWT 密钥均已替换。
- PostgreSQL/psql 显示 17.0，Redis、PostgreSQL 和应用端口都未暴露公网。
- `NEXT_PUBLIC_KUN_PATCH_ADDRESS_PROD` 是实际站点 HTTPS 地址，并已重新构建。
- OAuth 回调、SMTP、S3、图床和 CDN 地址已经逐项测试。
- `pnpm audit --prod`、typecheck、build、PM2 状态和本机 HTTP 检查通过。
- 数据库备份、上传文件备份和异机副本均存在，且完成过恢复演练。
- PM2 和 PostgreSQL 17.0 systemd 服务已配置开机启动，Nginx 证书续期测试通过。
