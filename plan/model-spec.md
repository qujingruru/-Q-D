# Model Spec — 小Q和小D 仿真引擎规范（v1.0）

> 本文档是引擎实现的唯一权威依据。所有数值为**示意性标定**，方向性结论以文献为准（见 §10 引用表）。
> 测试套件（`tests/literatureReproduction.test.ts`）断言的是**方向性**结论，不是具体数值。

## 1. 时间与规模

| 项 | 值 | 说明 |
|---|---|---|
| 时间步 | 1 周 | 离散时间 |
| 视野 | 2,600 步 = 50 年 | "相爱久久" = 存活至视野末端 |
| t=0 | "现在" | 初始条件由关系现状题决定 |
| 默认 N | 10,000 runs | 可选 1,000 快速档 |
| 分手 run | 提前退出 | 记录 duration 与 endReason |

## 2. 状态变量

每人 i ∈ {Q, D}：

| 变量 | 域 | 定义 |
|---|---|---|
| `mood_i` | [−10, 10] | 对关系的当周情绪（Gottman 的 W/H） |
| `satisfaction_i` | [−10, 10] | mood 的 EMA，α = 1/8 |
| `trust_i` | [0, 1] | 信任 |
| `commitment_i` | (0, 1) | 承诺（投资模型） |
| `alternatives_i` | [0, 1] | 感知替代选项 |

共同慢变量：

| 变量 | 域 | 定义 |
|---|---|---|
| `intimacy` | [0, 1] | 亲密（Sternberg） |
| `passion` | [0, 1] | 激情（自然衰减 + 新奇回补） |
| `investments` | [0, 2.5] | 投入（时间累积 + 里程碑跳升，入承诺时截断） |
| `networkSupport` | [0, 1] | 社交网络支持度，基线 0.5 |

## 3. 人格参数（问卷 12 构念 → PersonParams）

问卷答案归一化到 [0,1] 后按下列映射组合。**构念恒定、题面轮换**（见 questionnaire/constructs.ts）。

| 构念 | 符号 | 映射到 |
|---|---|---|
| 依恋焦虑 | `anx` | influence 负区斜率、冲动分手、理想化放大 |
| 依恋回避 | `avo` | influence 整体平坦、筑墙触发阈、修复延迟 |
| 情绪不稳定 | `neu` | σ 噪声、设定点、事件冲击放大（VSA 脆弱性） |
| 宜人性 | `agr` | 金钱/育儿冲突缓冲、支持质量 |
| 尽责性 | `con` | 惯性 a、生活稳定性 |
| 外向性 | `ext` | 新奇事件发起率 |
| 筑墙倾向 | `stonewall` | 冲突中冷处理时长与深度 |
| 急躁升温 | `escalate` | 冲突严重度（批评/鄙视方向，Four Horsemen） |
| 修复主动 | `repair` | 冲突转化概率（Gottman repair attempts） |
| 好事回应 | `cap` | capitalization 回应质量 |
| 亲密需求 | `need` | 亲密增长系数、需求错配判定 |
| 新奇寻求 | `nov` | 新奇事件率（Aron self-expansion） |

派生参数（映射公式，全部 clamp）：

```
b_i   = clamp( 1.8 + 2.2·(0.5 − neu) + 1.0·(0.5 − avo) + 0.6·(agr − 0.5), −3, 3 )   # 无影响设定点
a_i   = 0.32 + 0.28·con + 0.12·(1 − neu)                                             # 惯性 ∈ [0.32, 0.72]
σ_i   = 0.25 + 0.95·neu                                                              # 周噪声 sd
```

### Influence function（bilinear，Gottman 2002）

`I_i(x)` 为伴侣状态 x 对 i 的逐周影响（分段线性）：

```
若 x ≥ +pT_i:  I_i = +pS_i · (x − pT_i)
若 x ≤ −nT_i:  I_i = −nS_i · (x + nT_i)        # x+nT_i 为负 → I 为负
否则:          I_i = 0

pT_i = 2.0
pS_i = (0.30 + 0.35·anx_i + 0.15·ext_i) · (1 − 0.45·avo_i)      # 回避者正面影响钝化
nT_i = 1.5 + 2.5·avo_i                                          # 回避者对轻度负信号也反应
nS_i = 0.45 + 0.75·anx_i + 0.35·stonewall_i                     # 焦虑者负区斜率陡
```

**筑墙机制**：当伴侣 mood < −nT_i 连续 ≥ 3 周 → i 进入筑墙态（持续 `4 + 6·stonewall_i` 周）：`I_i` 输出 ×0.3、`repair_i` 暂时置 0、每周额外 mood −0.3（Gottman stonewalling）。

### 逐周主更新

```
mood_i(t+1) = clamp( a_i·mood_i + (1−a_i)·b_i + I_i(mood_j) + shocks_i + ε_i , −10, 10 )
ε_i ~ N(0, σ_i)   # Box–Muller，来自种子化 xoshiro128**
```

## 4. 慢变量更新（每周）

```
satisfaction_i ← satisfaction_i + (mood_i − satisfaction_i)/8

Δintimacy = 0.0025·(sat_Q + sat_D)/4 · (0.6 + 0.8·cap_avg)
          − 0.004·conflictThisWeek·(1 − repair_avg)
intimacy ∈ [0,1]

Δpassion = −λ·(passion − 0.12) + 0.16·noveltyThisWeek
λ = 0.0035 · (1 − 0.3·anx_avg)          # 激情半衰期 ~4 年，焦虑略缓

Δtrust_i = +0.0012·[I_i(mood_j) > 0] − 0.012·unrepairedConflict − 0.02·betrayalEvent
trust_i ∈ [0,1]

Δinvestments = 0.0009 + 0.5·milestoneJump(cohabit/marriage/baby)
investments ∈ [0, 2.5]

alternatives_i → 缓慢回归 0.22 + 0.25·(1 − norm(sat_i))，速率 0.002/周
```

### 承诺（Rusbult 投资模型）

```
commitment_i = sigmoid( 2.4·(sat_i/5) + 1.7·investments − 1.9·alternatives_i
                        + 1.0·networkSupport + 1.6·intimacy − 1.3 )
```

### 分手风险（每周，任一方触发即结束该世界）

```
h_i(t) = h0 · Φ( −(commitment_i − 0.35)·4 ) · (1 + 1.5·chronicLow_i)
h0 = 0.0009/周          # 标定目标：全参数中位下中位时长 ~8–15 年
chronicLow_i = 1 若 sat_i < −1 连续 ≥ 26 周，否则 0
```

**冲动分手**（罕见，Dailey on/off）：若单周 |Δmood| > 5 且 mood_i < −5：
`p = 0.012·neu_i·anx_i` → 分手；若 commitment_j > 0.5，则 40% 概率 8 周内复合（一次性事件，intimacy −0.1）。

## 5. 内生事件（泊松到达）

| 事件 | 周概率 | 效果 |
|---|---|---|
| 微冲突 | `0.10 + 0.06·extStress + 0.05·neu_avg − 0.03·agr_avg` | 双方 mood −(1.2 + 1.6·escalate_attacker + 0.8·neu_victim)；随后修复掷骰 `p = repair_i`：成功 → 下周 mood +0.6、trust +0.01、intimacy +0.015（冲突转化）；失败 → 对方再 −1.0、trust −0.012；若 stonewall_i > 0.6 → 筑墙触发概率 ×1.5 |
| 好事分享 | `0.12` | 当事人 mood +0.8；伴侣回应质量 `q = cap_j`：当事人额外 `+1.2·q − 0.6·(1−q)`，trust +0.008·q（Gable capitalization） |
| 新奇事件 | `0.05 + 0.04·nov_avg + 0.03·ext_avg` | passion +0.16、intimacy +0.02、双方 mood +0.8（Aron） |
| 替代漂移 | （并入慢变量） | 见 §4 |

## 6. 初始条件（关系现状题）

```
togetherMonths m ∈ [0, 600]
passion₀  = 0.15 + 0.85·exp(−m/36)                       # 热恋期峰值 ~0.9+
investments₀ = 0.3 + min(m/60, 1.1)
sat₀      = 当前满意感答案映射到 [−2.5, +2.5]
mood₀     = sat₀
commitment₀ = sigmoid(1.0 + sat₀/3)   # "现在还在一起"的先验
阶段（暧昧/热恋/稳定）微调 passion₀ 与 trust₀（热恋 +0.05 trust）
```

## 7. 情境模块（可组合，接口 `ScenarioModule { id, modifyParams(), weeklyHook(t, state, rng), narrative }`）

### ① 异地恋 + 团聚冲击（Stafford & Merolla 2007）
配置：`{ duration: 104 周（默认，可调 52–208）, intensity }`
- **异地期间**：冲突率 ×0.55；满意度入 EMA 前加**理想化偏置** `+0.9·(0.4 + 0.4·avo_avg + 0.3·anx_avg)`（感知虚高，记录累计 `bias`）；trust 增长 ×0.4；intimacy 增长 ×0.3；passion 衰减 ×0.6；新奇事件率 ×0.4；`need_i` 错配惩罚：每周 mood −0.15·|need_Q − need_D|
- **团聚周**（一次性）：`mood 双方 −= 2.8 + 1.2·bias`（理想化崩塌，正比于累计偏置）；此后 12 周冲突率 ×2.2；trust −0.05
- **复现目标**：异地期风险 ≯ 基线；团聚后 12 周风险尖峰 ≥ 基线 ×2（Stafford: ~1/3 三个月内分手 → 尖峰期累计分手概率显著上升）

### ② 父母反对（Sinclair, Hood & Wright 2014）
配置：`{ intensity k ∈ [0,1]，默认 0.7 }`
- `networkSupport = 0.5 − 0.4·k`
- **前 26 周**（罗朱效应的短暂真身）：commitment 输入 +0.18·k、sat +0.25·k
- **此后每周**：trust −0.004·k；commitment 额外侵蚀 `−0.25·k·anx_i`（焦虑者放大）；冲突率 +0.05·k
- **复现目标**：P(50y) < 基线（长期净负）；前 26 周平均 commitment ≥ 基线

### ③ 经济压力（Conger et al. 家庭压力模型）
配置：`{ severity f ∈ [0,1] }`
- `b_i −= 1.1·f`；`σ_i ×(1 + 0.5·f)`；冲突率 +0.07·f（金钱冲突文案）；`repair` 有效值 ×(1 − 0.3·f)（自我控制损耗）
- **复现目标**：P(50y) 与中位时长随 f 单调下降

### ④ 重大变故（Karney & Bradbury VSA 急性应激）
配置：`{ count: 1–2, 类型: 失业/疾病 }`
- 事件时点：视野内均匀随机（跳过前 26 周）
- 冲击：当事人 `mood −= (4.5 + 2.5)·(1 + 0.5·neu_i)`，进入 52 周恢复期（`b_i −= 1.5`）
- 恢复调节：伴侣支持质量 `s = 0.5·cap_j + 0.5·agr_j` → 恢复期 ×(1 − 0.5·s)；若 s > 0.7：intimacy +0.06（压力成长效应）
- **复现目标**：高神经质+低支持组合的伤害 ≫ 低神经质+高支持

### ⑤ 同居/新婚磨合（Huston PAIR 幻灭；Stanley sliding-vs-deciding）
配置：`{ atWeek: 26 }`
- 入住时 `investments +0.5`（一次性）
- **前 52 周**：冲突率 ×1.35、passion 衰减 ×1.3
- 幻灭压力（第 30 周）：`mood −= 2.0·idealizationGap`，`idealizationGap = 0.5·(avo_avg低 + anx_avg高)·(1 − decisional)`；`decisional = commitment@入住 > 0.7 ? 1 : 0`（决定型减半伤害，Stanley）
- **复现目标**：低承诺入住（sliding）比高承诺入住（deciding）结局更差

### ⑥ 育儿冲击（Cowan & Cowan 1995）
配置：`{ atWeek: 104 }`
- 出生时 `investments +1.0`（一次性，承诺反而↑）
- **104 周 regime**：`b_i −= 1.0·(1 − 0.5·agr_avg)`、冲突率 ×1.4、intimacy 增长 ×0.3
- 双峰机制：若 `cap_avg > 0.65` → regime 结束时 intimacy +0.12（意义感反超）；否则 trust −0.04
- **复现目标**：结局分布在高 cap 组呈双峰/更优

### ⑦ 事业忙碌（Greenhaus & Beutell 工作−家庭溢出）
配置：`{ busyPerson: Q|D|both }`
- 新奇事件率 ×0.5；每周 p = 0.15：忙碌方 `mood −= 1.0·(1 + neu)`，另一方 `−= 0.5`
- `need` 错配惩罚 ×1.5（聚少离多放大）
- **复现目标**：对称参数下，busy=both 比 busy=单方更伤

### 组合规则
模块效果**乘性/叠加并存**：参数修改叠加，事件率修改相乘；`networkSupport` 取最小值。组合上限建议 ≤3（UI 软限制）。

## 8. 输出与指标

### 每 run 摘要（Monte Carlo 存储）
```
RunSummary { runIndex, seed, durationWeeks, endReason, dramaScore, survived }
endReason ∈ { exhaustion(慢性消耗), impulsive(冲动), stonewall(沉默), external(外压主导), censored(存活至50年) }
dramaScore = Σ 存活下来的风险尖峰周（h_i > 0.3·h_max 的周数）
```

### 聚合指标
- **P(相爱>50年)** = survived / N（头条指标）
- 中位/众数相爱年数、分布直方图（1 年桶）
- 生存曲线 S(t)（Kaplan–Meier 式）
- endReason 分布（→ 诗意结局标签）

### 百分位分数
```
score = 0.6·P(50y) + 0.4·min(medianYears, 50)/50
percentile = 基准池中 score 严格低于该值的比例
```

### 里程碑与故事节点（重放时提取）
- 事件 |效应| > θ(类型阈值) 的冲突/修复/好事/新奇/压力事件
- 阈值穿越：commitment 首次 < 0.35、passion 首次 < 0.3、intimacy 首次 > 0.8
- 濒危获救：h_i > 0.3·h_max 的周及其后 4 周内存活
- 情境节点：异地开始/团聚、入住、生育、变故、父母施压窗口
- 稀有彩蛋（<1%）：重放时按种子掷骰注入稀有模板（"第 30 年重返初遇地点"等）

### 三种策展世界
| 名称 | 选择规则 | 章节 |
|---|---|---|
| 最长久的一次 | argmax durationWeeks | 基线报告 |
| 最短暂的一次 | argmin durationWeeks（压力情境） | 压力报告 |
| 奇迹世界 | survived ∧ argmax dramaScore（压力情境） | 奇迹章节 |

## 9. 文献复现测试（方向性断言，Vitest）

| # | 断言 | 文献依据 |
|---|---|---|
| T1 | secure×secure 中位时长 > anxious×avoidant（≥2×） | Hazan & Shaver; 依恋配对研究 |
| T2 | repair 四分位 → 中位时长单调不减 | Gottman repair attempts / 5:1 |
| T3 | 父母反对：前 26 周 commitment ≥ 基线，且 P(50y) < 基线 | Sinclair et al. 2014 |
| T4 | 异地期风险 ≤ 基线×1.1；团聚后 12 周风险 ≥ 基线×2 | Stafford & Merolla 2007 |
| T5 | 经济 f ∈ {0, 0.5, 1} → P(50y) 严格递减 | Conger et al. |
| T6 | cap 低 vs 高：P(50y) 更低 | Gable et al. 2004 |
| T7 | 同种子重放 → RunSummary 逐字节一致 | 决定论 |
| T8 | 全状态有界（10 万步扫描） | 数值稳定 |
| T9 | sliding 入住 < deciding 入住（中位时长） | Stanley et al. 2006 |
| T10 | neu 高 × 支持低 的变故伤害 > neu 低 × 支持高 | Karney & Bradbury VSA |

## 10. 引用表

| 模型要素 | 引用 |
|---|---|
| 耦合动力学/influence function | Gottman, Murray, Swanson, Tyson & Swanson (2002). *The Mathematics of Marriage*. MIT Press. |
| VSA 框架 | Karney & Bradbury (1995). *Psychological Bulletin*, 118(1) |
| 依恋 | Hazan & Shaver (1987); Fraley, Waller & Brennan (2000) ECR-R |
| 大五短表 | Gosling, Rentfrow & Swann (2003). TIPI. *JPSP* |
| 投资模型 | Rusbult, Martz & Agnew (1998); Le & Agnew (2003) 元分析 |
| 爱情三角 | Sternberg (1986). *Psychological Review*, 93(2) |
| capitalization | Gable, Reis, Impett & Asher (2004). *JPSP* |
| 自我扩展/激情衰减 | Aron & Aron; Acevedo & Aron (2009). *Social Psychological and Personality Science* |
| 追逃循环 | Christensen & Shenk (1991). demand-withdraw |
| 罗密欧与朱丽叶效应证伪 | Sinclair, Hood & Wright (2014). *Social Psychology*; Driscoll, Davis & Lipetz (1972) 原始研究 |
| 异地恋 | Stafford & Merolla (2007); Stafford, Merolla & Castle (2006). *Personal Relationships* |
| 家庭压力模型 | Conger et al. (1990, 1999+). |
| 幻灭/PAIR | Huston, Caughlin, Houts, Smith & George (2001). *ISPDP* 感谢 PAIR 项目 |
| sliding vs deciding | Stanley, Rhoades & Markman (2006). *JPSP*(as adapted) |
| 育儿冲击 | Cowan & Cowan (1995); Doss et al. (2009). *JFP* |
| 工作−家庭冲突 | Greenhaus & Beutell (1985). *AMR* |
| 分手复合 | Dailey, Pfiester, Jin, Beck & Clark (2009). on-again/off-again |
| 情绪传染 | Hatfield, Cacioppo & Rapson (1994). *Emotional Contagion* |

> 免责：本模型为方向性简化的娱乐产品，参数为示意值，不构成任何关系建议或临床结论。
