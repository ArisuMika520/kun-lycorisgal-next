import axios from 'axios';
import http from 'node:http';
import https from 'node:https';

// 部署服务器没有 IPv6 出站路由，Node 默认双栈 DNS 会随机命中 AAAA 记录，
// 导致 TCP 卡到 ETIMEDOUT (NODE_OPTIONS=--dns-result-order=ipv4first 在
// 当前 Node 22 + axios 1.16 组合下不能稳定生效)。这里强制所有 spider
// 出站走 IPv4。
export const spiderHttp = axios.create({
    httpAgent: new http.Agent({ family: 4 }),
    httpsAgent: new https.Agent({ family: 4 }),
});
