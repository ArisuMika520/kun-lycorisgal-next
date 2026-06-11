# `pnpm typecheck` / 工具链 技术债清单（待后续解决）

> 记录日期：2026-06-11
> 来源：接入鲲 OAuth 的 C1（数据层）会话中，运行验收命令时发现的**先存问题**。
> 与 OAuth 改动**无关**：对照验证过——带/不带 OAuth 改动，`tsc` 错误数都是 72，C1 新增 0 个。
> 环境：`next@15.5.18` / `typescript@5.8.3` / `prisma@6.12.0` / `@prisma/client@6.12.0`。

## ✅ 处理状态（2026-06-11 已修复）

| 项 | 状态 | 做法 |
| --- | --- | --- |
| 问题 0 `prisma:generate` | ✅ 已修 | 脚本改为 `pnpm exec prisma generate`，验证通过 |
| 问题 1 方案 B | ✅ 已做 | 新增 `tsconfig.typecheck.json`，`typecheck` 脚本改用 `-p tsconfig.typecheck.json` |
| 问题 2 连带 4+2 个 TS2306 | ✅ 已消 | 6 个全部报在 `.next/types/`，随方案 B 一并移出 typecheck 范围 |
| 问题 3 TS2345 | ✅ 已修 | 见下方更正：不止是类型标注，`protocols` 结构本身写错了 |
| 问题 2 的 2 个 stub 文件 | ✅ 已拍板处理 | `debug-code/page.tsx` 补最小占位（`return null`）；`upload/video/route.ts` 已删（代码在 git 历史里）。连带死代码待清：`app/api/upload/videoUtils.ts` 与 `lib/s3.ts` 的 `uploadVideoToS3` 只被已删路由引用 |
| 问题 1 方案 A（路由重构） | ⏳ 未做 | 独立立项，非紧急 |

**现基线：`pnpm typecheck` = 0 错误，可作为 CI 门禁。** 全量 `tsc --noEmit`（含 `.next/types`）仍 71 个，均为生成物校验冲突（问题 1/2），属已知噪音。

> **问题 3 更正**：根因不只是缺类型标注——`hast-util-sanitize` 的 `protocols` 以**属性名**（`href`/`src`）为键，原代码误用标签名（`a`/`img`）嵌套了一层，导致「允许 `tel:` 链接」的意图从未生效（运行时一直走默认协议表）。已改为正确结构并标注 `Options` 类型；运行时行为变化仅为 `a[href]` 新增允许 `tel:`（即原意图），其余与默认一致。

## TL;DR

1. **`pnpm prisma:generate` 脚本是坏的**（`pnpx` 拉到 Prisma 7.x，拒绝 `url=env()`）。1 行可修。
2. **`pnpm typecheck` 基线红：72 个错误**，其中 **71 个在 Next.js 生成的 `.next/types/` 里**，只有 1 个是真·手写源码错。
3. 项目 `next.config.ts` 设了 `typescript.ignoreBuildErrors: true` + `eslint.ignoreDuringBuilds: true`，所以 **`next build` / `next dev` 从不因这些失败**，运行时不受影响；只有独立的 `tsc --noEmit` 会暴露。

## 复现 / 核对命令

```bash
# 1. prisma:generate 脚本坏（会报 P1012）；改用 pinned 本地版可成功
pnpm prisma:generate                 # ✗ pnpx 拉 Prisma 7.x，P1012: url=env() 不再支持
pnpm exec prisma generate            # ✓ 本地 6.12.0 正常

# 2. typecheck 基线
pnpm exec tsc --noEmit 2>&1 | grep -cE 'error TS'          # => 72
pnpm exec tsc --noEmit 2>&1 | grep -oE 'error TS[0-9]+' | sort | uniq -c | sort -rn
#   65 error TS2344   （.next/types 路由校验器）
#    6 error TS2306   （"not a module" 空/禁用 stub）
#    1 error TS2345   （renderMarkdownToHtml.ts，唯一真源码错）
```

---

## 问题 0 · `prisma:generate` 脚本坏（最易修，优先）

- **现象**：`package.json` 里 `"prisma:generate": "pnpx prisma generate"`。`pnpx`(=`pnpm dlx`)每次从 npm 拉**最新** Prisma（当前 7.8.0），而 7.x 不再支持 `schema.prisma` 里的 `datasource { url = env("KUN_DATABASE_URL") }`，报 `P1012`。
- **影响**：任何按文档跑 `pnpm prisma:generate` 的人都会失败，误以为 schema 有问题。本地 `pnpm exec prisma generate`（pinned 6.12.0）一切正常。
- **修复（1 行，二选一）**：
  - 把脚本改成走本地 pinned 版：`"prisma:generate": "pnpm exec prisma generate"`（推荐，和 `postinstall` 的 `prisma generate` 一致）。
  - 或固定版本：`"prisma:generate": "pnpm dlx prisma@6.12.0 generate"`。
- **风险**：极低，可逆。
- **附带**：同理，`prisma migrate diff` 等也别用 `pnpx`，要用 `pnpm exec prisma ...`，否则 7.x 的 flag 变了（`--from-schema-datasource` 已被移除）。

---

## 问题 1 · TS2344 × 65 — 路由「服务函数导出」撞 Next 15.5 严格校验（占 90%）

- **根因**：KUN 路由文件**同时导出**服务函数和 HTTP handler：
  ```ts
  // app/api/auth/login/route.ts
  export const login = async (input) => {...}   // 给前端「类型化请求」用的服务函数（KUN 架构）
  export const POST  = async (req) => {...}      // HTTP handler
  ```
  Next.js 15.5.18 生成的 `.next/types/app/**/route.ts` 校验器要求 route 模块**只能**导出 HTTP 方法 + 少数已知配置项，任何额外导出（`login`/`register`/…）被判为 `never` → TS2344。
- **影响面**：系统性，约 50+ 路由文件，**非单文件 bug**。是 KUN 路由范式 与 Next 15.5 生成类型 的冲突。
- **示例报错**：
  ```
  .next/types/app/api/auth/login/route.ts(12,13): error TS2344:
    Property 'login' is incompatible with index signature.
    Type '(input) => Promise<...>' is not assignable to type 'never'.
  ```
- **修复方案**：
  - **A · 正解但重**：把服务函数从 `route.ts` 挪到同级非路由文件（如 `login/service.ts`），route 只留 handler；改所有调用点。正确，但动 ~50 文件，应**独立立项**，别和功能开发混。
  - **B · 务实（推荐先做）**：让 `typecheck` 不检查 Next **生成**的 `.next/types`（本就是构建产物）。新增 `tsconfig.typecheck.json`：
    ```jsonc
    // tsconfig.typecheck.json
    { "extends": "./tsconfig.json",
      "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],   // 去掉 ".next/types/**/*.ts"
      "exclude": ["node_modules", ".next"] }
    ```
    并把脚本改为 `"typecheck": "tsc --noEmit -p tsconfig.typecheck.json"`。一次消掉这 65 个 + 问题2里 4 个连带的。
    - **代价**：独立 typecheck 不再校验路由/页面签名——但 `ignoreBuildErrors:true` 早已放弃这层 Next 校验，姿态一致。
  - **C**：维持现状，把「`pnpm typecheck` 红」记为已知基线，收口靠 `next build`。
- **风险**：A 高（大重构）；B 低（仅改 typecheck 范围，可逆）。

---

## 问题 2 · TS2306 × 6「not a module」— 空/禁用 stub 文件

- **真问题源（2 个）**：
  - `app/(main)/debug-code/page.tsx` — **0 字节空文件**，不是模块。
  - `app/api/upload/video/route.ts` — 66 行，但 `export const POST` 在第 58 行**被注释掉**（`// export const POST`），零导出 → 非模块。疑似未写完/临时禁用。
- **连带（4 个）**：`.next/types/app/`、`.next/types/validator.ts` 等生成聚合器 import 了上面两个非模块而报错——修好上面 2 个，这 4 个自动消失。
- **修复**：每个 stub 三选一——删除 / 补最小导出（`export default function(){return null}` 或 `export {}`）/ 写完。
- **✅ 已决策（2026-06-11 人工拍板）**：
  - [x] `debug-code/page.tsx` → 补最小占位（`export default` 返回 `null`）。
  - [x] `upload/video/route.ts` → 删除（连同空目录；需要视频上传时从 git 历史找回或重写）。

---

## 问题 3 · TS2345 × 1 — 唯一的真·源码类型错误

- **位置**：`app/api/utils/render/renderMarkdownToHtml.ts:103`
  ```ts
  .use(rehypeSanitize, customSchema)   // customSchema 类型与 rehype-sanitize 期望的 Schema 结构对不上
  ```
- **修复（1 行）**：从 `rehype-sanitize` 导入 `Schema`/`Options` 类型标注 `customSchema`，或 `.use(rehypeSanitize, customSchema as Options)`。
- **风险**：低。建议顺手修。

---

## 建议处理顺序（后续单开会话）

1. **问题 0**（1 行）+ **问题 3**（1 行）→ 立即可做，零风险。
2. **问题 1 方案 B** + **问题 2 连带** → 加 `tsconfig.typecheck.json`，`tsc` 72 → 2。
3. **问题 2 的 2 个 stub** → 等人工决策后清理 → `tsc` 2 → 0。
4. **问题 1 方案 A**（路由重构）→ 是否要做、何时做，独立评估；只要 `ignoreBuildErrors:true` 在，非紧急。

> 完成本清单后，`pnpm typecheck` 可作为干净的 CI 门禁。在此之前，验证「自己的改动是否引入新错误」请对照基线计数（当前 72），而非期望全绿。
