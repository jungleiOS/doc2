# Meta 闭源 MuseWonder：重要的不是模型，是获取方式那一行字

把 10 月 12 日 Meta 的发布博客倒着读一遍，你会发现这次发布里最有信息量的段落，排在能力介绍后面。

Muse Wonder 确实是 Meta 迄今最强的模型，这个各大媒体都写过了。但真正值得行业注意的细节是获取方式：以前 Llama 是把模型文件直接挂出来，谁都能下载、部署、魔改；这次没有模型文件下载这回事了。Muse Wonder 只能通过 Meta 模型 API 和 Muse Code 调用，Muse Wonder Full 连 API 都不开，只进 Muse Code 每月 50 美元和 200 美元的订阅档，后续再接入 Muse 个人助手 App。<!-- 判断句 -->

![1-official-aboutfb.png](https://s41.ax1x.com/2026/10/14/pnde7vT.png)

*图源：Meta 官方新闻室，Introducing Muse Wonder and Muse Wonder Full（2026-10-12），frontier models for agents*

![2-official-research-blog.png](https://s41.ax1x.com/2026/10/14/pndeT2V.png)

*图源：Meta AI 研究博客，Muse Wonder: A Frontier Model For Personal & Professional AI Agents（2026-10-12）*

一家靠 Llama 把「开源大模型」四个字焊在自己名字旁边的公司，现在把最强模型收进了付费订阅。这件事的信号意义大于模型本身，下面按时间线把账算清楚。

## 先把时间线摆全

这次没有「突然转向」。Meta 的路线变化是一步一步走出来的，只是每一步都比较安静：

- 2023 到 2025 年，Llama 1/2/3/4 一路开放权重，扎克伯格多次公开站台开源路线，Llama 的 GitHub 仓库攒了近 6 万 star，Meta 靠它赚到了 AI 叙事的话语权和整个开发者生态的好感。<!-- 判断句 -->

![3-llama-github.png](https://s41.ax1x.com/2026/10/14/pndeICq.png)

*图源：GitHub facebookresearch/llama 仓库页，59.6k stars*

- 2026 年 4 月起，画风变了。新模型全部收进闭源的 Muse 产品线：Muse Spark（4 月，仅私有 API 预览）、Muse Image（7 月发布）和 Muse Video（7 月预览）、Muse Code（8 月，付费 coding agent）、Meta Model API（7 月公开预览，初期仅限美国）、Muse 个人助手 App（月费 20/100 美元两档）。截至目前，Llama 没有后续版本了。
- 2026 年 8 月 10 日，扎克伯格在 Instagram 视频里宣布「即将」开放 Muse Spark 1.2 权重，同一天放了一个 Apache 2.0 的 30B 小模型 Muse Glimmer——蒸馏自 Spark，做个姿态。9 月 Spark 1.3 发布时又重申了一次权重 soon。到今天，两个多月过去，没有发布日期，没有模型文件，没有许可条款。
- 10 月 12 日，Muse Wonder 发布，闭源，主力模型走 API 按量计费（每百万 token 输入 4 美元、输出 20 美元），最强版本只卖订阅。

把这四步连起来看，我的判断是：**Meta 没有背叛开源路线，它只是把一条已经走完的路线公开收尾了。**Llama 时代的开放权重，本质是拿模型换生态位——换开发者的适配、换云厂商的分发、换「开源旗手」的叙事地位。这个目的已经达到了，而当模型本身开始能直接卖钱，继续把最强能力免费放出去，就从战略资产变成了实打实的亏损。<!-- 判断句 -->

这个转变也有财务背景。据 Reuters 对 Meta 2026 年 Q2 财报的报道，Meta 把全年资本开支指引上调到 1300 亿到 1450 亿美元，自由现金流同比跌了九成，财报当天盘后股价一度跌约 10%。<!-- 判断句 -->花这个量级的基础设施钱，再靠免费权重给竞争对手和云厂商送弹药，这笔账在董事会那里已经说不通了。

## 闭源改变的是什么等式

这件事对行业格局的影响，我认为有三个层面，重要性依次递减。

**第一层，开源旗舰这条路被现实的商业数据釜底抽薪了。**过去两年多，「开放权重能不能养出一家头部模型公司」是整个行业最大的实验之一，Llama 是最有力的正方证据。现在最强的正方亲手关掉了这个实验。<!-- 判断句 -->对押注开源路线的团队（以及一众靠 Llama 生态吃饭的创业公司）来说，这不只丢了一个盟友，还丢了整个叙事里最有分量的那个案例。以后「开源旗舰」这个词，大概率只能出现在中小型号模型上了。

**第二层，模型战争的打法从「卖模型」进一步转向「卖入口」。**Muse Wonder Full 不开放 API 这一点最值得琢磨——Meta 最强的模型不外卖，只装进自己的 coding agent 和订阅产品里。这跟 OpenAI 把最强能力留给 ChatGPT、Anthropic 把 Claude Code 做成独立产品的方向是同一个逻辑：模型能力趋同的背景下，谁的分发入口离用户的日常工作流近，谁才能把能力变成收入。<!-- 判断句 -->闭源在这里是手段，入口垄断才是目的。

**第三层，对普通开发者和用户，短期反而是好事。**API 定价每百万 token 输入 4 美元、输出 20 美元，和 Opus 5.5 完全同价位（Anthropic 官网同档定价，见 [BenchLM 汇总的 Claude API 价格页](https://benchlm.ai/anthropic/api-pricing)），摆明了就是贴着对手打。前排有人质疑 AA 榜上 Muse Wonder 的综合分（52/56）还压不过 Opus 5.5 的 58，这个差距确实存在。但 agent 类任务本来就不是单看综合分，多一个同价位的顶级模型进 API 市场，买方永远受益。<!-- 判断句 -->综合分口径以第三方评测机构 Artificial Analysis 的 Intelligence Index v4.3 为准。

![4b-artificial-analysis-top.png](https://s41.ax1x.com/2026/10/14/pndeo80.png)

*图源：Artificial Analysis 模型对比页（2026-10-14），Intelligence Index v4.3：Claude Opus 5.5 居首（58），Muse Wonder Full (max) 56*

顺带一提，前排有答案说 Meta 自家榜单上 Muse Wonder Full 在好几个 agent 任务上领先 Opus 5.5，和第三方 AA 的结论对不上。这个矛盾是真实的——Meta 的对比图里自家模型取最高分、竞品按 best-effort 跑，方法学已经被不少第三方指出过。两边都别全信，等更多独立复测。<!-- 判断句 -->

## 所以回到问题本身

「对行业格局产生哪些影响」——我的答案浓缩成一句：MuseWonder 本身不改变格局，它改变的是「开源大旗值多少钱」这个定价。<!-- 判断句 -->当投入以千亿计、模型以 API 计价，开源从信仰问题退化成了会计问题。

最后留一个观察点，比这次的闭源发布重要得多：Muse Spark 的权重承诺到底兑不兑现。兑现，说明 Meta 还想留着「小模型开源、旗舰闭源」的双轨人设；继续拖下去，Llama 攒下的那 6 万 star 就真成历史陈列了。<!-- 判断句 -->

我知道这个说法在评论区会有不同意见——Llama 的开源当年到底是情怀还是生意，欢迎聊。我的立场已经写在上面的时间线里了。

---
*2026-10-14 整理；数据来源：Meta 官方新闻室发布博客（2026-10-12）、Artificial Analysis Intelligence Index v4.3、Meta 2026 Q2 财报（Reuters 2026-07-29）、GitHub facebookresearch/llama、The Verge 报道（2026-10-12）。*

<!-- 图片溯源映射（发布前删除本段）
Meta闭源MuseWonder/闭源对行业格局影响/raw/1-official-aboutfb.png -> https://s41.ax1x.com/2026/10/14/pnde7vT.png
Meta闭源MuseWonder/闭源对行业格局影响/raw/2-official-research-blog.png -> https://s41.ax1x.com/2026/10/14/pndeT2V.png
Meta闭源MuseWonder/闭源对行业格局影响/raw/3-llama-github.png -> https://s41.ax1x.com/2026/10/14/pndeICq.png
Meta闭源MuseWonder/闭源对行业格局影响/raw/4b-artificial-analysis-top.png -> https://s41.ax1x.com/2026/10/14/pndeo80.png
重传命令：node .agents/skills/image-host-upload/upload.js --force "Meta闭源MuseWonder/闭源对行业格局影响/zhihu-闭源对行业格局影响-v1.md"
-->
