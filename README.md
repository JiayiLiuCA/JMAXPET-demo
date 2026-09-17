# JMAXPET 内部运营管理系统 — Mock Demo

给客户看产品形态的**可点击前端 demo**：Next.js 15 App Router + TypeScript + Tailwind v4 + shadcn/ui + zustand。
没有后端、数据库、登录鉴权；所有数据来自 `src/data/*.ts` 的 seed，所有"保存"只改内存，**刷新页面即回到 seed**。
只涉及运营，不接入财务：Case 里只有一个"收款情况"分区记录状态和备注，不做提醒、不管明细（客户另有 invoice / 记账软件）。

## 跑起来

```bash
npm install
npm run dev
# 打开 http://localhost:3000
```

首页是登录选择页，点任一账号即登录（无密码）。

## 账号与角色

| 账号 | 角色 | 登录后看到 |
|---|---|---|
| Rita | 管理员 / 运营主管 | 全部 Case、全部页面、账号与权限 |
| 小林 / 小周 | 操作员 — 前期文件 | 自己负责的 Case；Case 里只展开 疫苗/文件、主人信息（其余分区为灰色进度卡） |
| 小张 | 操作员 — 接送与寄养 | 自己负责的 Case；只展开 司机、寄养、接宠日志（默认还能看收款情况，可在权限矩阵里取消） |
| Teddy | 订舱 | 只看被指派的订舱任务；Case 只展开 航班与订舱，主人护照、收款情况是灰卡 |
| 老王（YYZ）/ 老李（YVR） | 司机 | 只有"我的任务"，手机端布局，大按钮 |

**切换账号**：顶栏右侧"当前登录：xxx"下拉，一键切换，**保留当前内存数据**（方便演示"A 做了操作，B 能看到"）。
下拉里还有"重置 demo 数据"和"退出到登录页（重置数据）"。

**当前日期**：顶栏"当前日期"按钮可以拨到任意一天（日历或 +1/+2/+7/+13 天快捷键）。拨动后系统按 48h / 24h / 当天规则生成提醒，并刷新 Timeline 的"延误"标记。seed 的"今天"是 **2026-09-16**。

**打开 Case**：今日总控 / Case 列表 / 待办 / 日历 / 通知里点任一行或事件，进入子页面 `/cases/<id>`；页面顶部有返回和面包屑，分区锚点吸顶。**点 workflow 进度条上的任一步骤，页面滚动到该步骤对应的分区**（文件类步骤 → ④，订舱 / 航班跟踪 → ⑤，送机 / 清关 / 到家 → ⑥，收尾款 → ⑨，归档 → ⑧），悬停可看计划日期、负责人、缺什么文件。

**布局**：左侧导航栏固定不动，右侧（顶栏 + 内容）独立滚动。

**不同分辨率**：自动缩放。根字号随视口宽度流动（`globals.css` 里 `html { font-size: clamp(15px, 0.65vw + 6px, 23px) }`），Tailwind 的字号 / 间距 / 圆角 / 图标全是 rem，所以 1440p、2K@150%、2K@100%、4K 都会整体等比缩放，不需要改浏览器或系统缩放。

## 演示路径（已按此跑通）

1. **Rita 登录 → 今日总控**：上下堆叠的分组表格，顶部一行计数锚点（紧急 / 今天必须做 / 明天 / 未来 7 天 / 即将出发 / 谁在等我 / 风险 Case）可跳转，第一组是"近一周航班"。点任一行（例如 紧急 里的 Mochi）进入 Case 页面，workflow 进度条里"CFIA 盖章"是红色延误，悬停看详情，点它页面滚到 ④ 疫苗 / 文件 Timeline；进度条下方一行是当前步骤和"标记完成"。
2. **切到 Teddy**：只看到"我的待办"（待处理订舱 / 已确认）。点任一 Case：只有 ⑤ 航班与订舱 可编辑，② 主人信息 是灰卡"该分区由 小林 处理 · 当前进度：已完成"。
3. **切到老王**：页面变成手机宽度。"今天"里有 Luna 的接宠任务，依次点 **已出发 → 已接到**。切回 Rita，打开 Luna（今天必须做），⑧ 操作日志里出现"老王 任务「接宠 9月16日」状态 → 已接到"。
4. **航变**：Rita 打开 Teddy（即将出发，9/18 CX829）→ ⑤ 分区点 **标记航变** → 选"当天拒载"，填新日期 → 确认。页面顶部出现红框"航变影响清单"（司机任务需改期、健康证是否过期、寄养延长几天、AWB 作废），航司状态变"已改期"、加风险标签"时间"。右上角 toast 提示已通知 小林、小张、Teddy、老王。切到老王 → 铃铛红点 → 看到这条航变通知。
5. **48h 提醒**：Rita 在今日总控点 **创建任务**（默认：接宠、指派老王、日期 = 15 天后）→ 创建并指派。然后点顶栏"当前日期"→ **+13 天**。toast 提示系统生成了 N 条提醒；切到老王 → 铃铛里出现"48 小时提醒 · 接宠"。（拨到 +14 天会变成 24 小时提醒，+15 天是当天提醒。）
6. **权限矩阵**：Rita → 账号与权限 → 矩阵里取消"操作员 — 接送与寄养"行 × "⑨ 收款情况"列 的"看"→ 切到小张 → 打开任一 Case，⑨ 分区变成灰卡"由 Rita 处理"。

其他可以顺手演示的：
- **航线速查**：卡片上"填入 Case"→ 选一个同出发地的 Case → 航班子表回填、航司状态变"待确认"，并进入该 Case。
- **日历**：月 / 周视图，事件 = 任务 + 出发日 + 寄养起止，按站点 / 负责人 / 类型筛选，点事件进 Case。
- **新建 Case**：选模板后按出发日倒推每一步计划日期，创建即进入。
- **订舱回写**：Teddy 在 Case ⑤ 点"确认订舱 / 填 AWB"→ 航司状态变已确认、订舱步骤完成、通知操作员和 Rita。
- **司机完成送机**：Case next_step 自动跳到"跟航班"，阶段变"出发"。

## 代码结构

```
src/
  app/
    page.tsx                  登录选择页
    (dashboard)/
      layout.tsx              应用外壳（侧栏 / 顶栏 / 司机手机框）+ 路由权限守卫
      dashboard/              今日总控（上下堆叠分组表格）
      cases/                  Case 列表；cases/[id] 为 Case 详情子页面
      todo/  calendar/  routes/  archive/  permissions/
  components/
    shell/                    Sidebar、Topbar、UserSwitcher（切换账号）、DateControl（当前日期）、NotificationBell
    case/                     CaseDetail（详情页）、WorkflowProgress（步骤点击滚动到分区）、ImpactCard、各弹窗（航变 / 订舱 / 创建任务 / 新建 Case）
    case/sections/            ①～⑨ 分区组件（顺序：宠物 / 主人 / 路线 / 文件 / 航班 / 司机 / 寄养 / 备注+销售交接+日志 / 收款）
    dashboard/                CaseTable、BucketSection、FlightTable、Filters
    tasks/DriverTaskCard.tsx  司机手机端任务卡
    common/                   StatusBadge、Field（读写切换字段 / SimpleSelect）、UserAvatar
    ui/                       shadcn/ui（Base UI 版）
  data/
    options.ts                状态选项（priority / stage / next_step / …）
    users.ts  roles.ts        账号；角色 → 页面、Case 可见范围、默认权限矩阵
    workflows.ts              5 套 workflow 模板（加→中托运 / 加→中随行 / 美→中 / 中→加 / 中→澳）；暂无管理页面，只用于生成 Timeline
    routes.ts                 19 条航线
    cases.ts                  28 个进行中 + 5 个归档 Case（mkCase 按模板自动生成 Timeline、疫苗日期、航班）
    tasks.ts  notifications.ts  logs.ts
  lib/
    permissions.ts            页面 / 分区权限判断、Case 可见范围、灰卡的负责人与进度摘要
    workflow.ts               按 departure_date 倒推 Timeline、改期后重排、延误刷新
    buckets.ts                今日总控 7 个分组的规则、近一周航班、状态颜色
    impact.ts                 航变影响清单
    reminders.ts              48h / 24h / 当天 提醒生成
    navigation.ts             useOpenCase：跳转到 Case 子页面
    dates.ts                  日期工具（SEED_TODAY = 2026-09-16）
  store/useAppStore.ts        zustand 单 store：登录 / 切换 / 拨日期 / Case 编辑 / 航变 / 任务 / 通知 / 权限 / 模板
```

## 说明

- 所有宠物、主人、护照号、电话、地址均为编造（护照 `E12345601` 式、电话 `+1 416-555-01xx` 式）。
- 品牌色按官网：主色 `#2B5672`，选中态 `#ECD7CC`，信息 `#C8E0FE`，分组颜色为插画配色（赤陶 / 金褐 / 芥末 / 奶咖 / 鼠尾草 …）。
- 司机端在桌面浏览器里会显示为居中的 430px 手机框；真机手机宽度同样可用。
- 没有 localStorage 持久化、没有测试、没有部署配置（按需求）。
