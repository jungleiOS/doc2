# AI 项目是真牛还是吹牛？为什么网上吹得天花乱坠，真用起来却不是一回事？

先说一个可能两边都得罪的答案：**吹的和真牛的，往往是同一个项目。**

我们是个全员用 AI 开发的小团队，天天拿这东西干活，被 demo 骗过，也被真能力救过命。我的观察是：同一个产品，发布会上的它和交付到你手里的它，差的通常不是「这家公司是不是骗子」，而是中间隔着三个具体的环节。把这三个环节看清楚，「真牛还是吹牛」就不需要吵架了，可以验。

---

## 环节一：demo 跑的不是你的场景

Google 的 Gemini 在 2023 年 12 月的多模态演示，是当时刷屏级的：语音对话、实时识别画面，丝滑得像科幻片。

然后 Bloomberg 把幕布掀了。Google 发言人向 Bloomberg 承认，那段视频不是实时录的，模型没有真的接收语音和视频输入，用的是静态图片帧加文本提示，配音是后期加上去的，回答做了缩短和加速。视频角落倒是诚实标注了「sped up responses」。

![Gemini演示幕后-谷歌官方博客截图](https://d.uguu.se/dthrkvqQ.png)

（图源：量子位转引 Google 官方博客）

东西不假，只是排练过。<!-- 判断句 -->排练过的意思是你买到手的东西，和你在台上看到的东西，中间差着一整套「如果」——如果你的环境没那么干净、你的输入没那么标准、你的任务没那么正好。

AI 程序员 Devin 的剧本几乎一样。2024 年 3 月发布，演示里它自己在 Upwork 上接活、写代码、交差。

一个月后，YouTube 博主 Internet of Bugs 逐帧拆解了这段演示：Devin 是自己搜 "road damage" 这个关键词找到的任务（像是提前知道的），实际跑了约 6 个小时，代码里有 bug，任务没真正完成。

发布那个任务的 Upwork 客户本人也是博主，专门发了条视频：Devin 没解决我的问题。

![Devin争议-逐帧打假视频封面](https://n.uguu.se/GddZkXDp.webp)

（图源：量子位）

Cognition 公司的回应耐人寻味：没有承认造假，但承认挑了好的例子。<!-- 判断句 -->

「挑了好的例子」，就是环节一的官方学名。<!-- 判断句 -->你的场景里没有好例子可挑，落差就产生了。

## 环节二：你看到的效果背后有人

2024 年 2 月，瑞典支付公司 Klarna 宣布了一件大事：它的 OpenAI 驱动 AI 客服，干完了约 700 名全职客服的工作量。这个故事当时的传播口径是「AI 一人顶七百」，被当成 AI 落地的标杆案例反复引用。

2025 年 2 月，CEO 在财报电话会上承认客服质量下降。2025 年 5 月，Bloomberg 报道 Klarna 重新招聘人工客服，CEO 的原话方向是「更人性化的支持是我们的未来」。

700 个人工岗位被 AI 替换的故事，最后是 AI 干不了的活又招了人回来。<!-- 判断句 -->这类故事的共同点：宣传时展示的是 AI 独立完成的部分，被藏起来的是人工兜底的部分。<!-- 判断句 -->

Amazon 的「拿了就走」无人收银 Just Walk Out 也是同一路数：2024 年被 The Information 曝出，背后有大约一千人的印度团队在看「无人」收银的视频。

这不是说 AI 在里面什么都没干——它确实干了一部分。<!-- 判断句 -->但「AI 干了一部分」和「你看到的全自动」之间，差着一群你没看见的人。

## 环节三：榜单是为考试设计的

Devin 发布时有一个非常硬的数据：在无人工辅助下解决 SWE-bench 的 13.86%，而此前无辅助的最好成绩是 1.96%。

两个注脚：这是 Cognition 自己报的，不是独立评测；跑的是 25% 的随机子集。<!-- 判断句 -->

Gemini Ultra 当年宣传的 MMLU 90.0% 也是类似情况——后来有工程师扒出那个分数用的是 CoT@32（允许模型尝试 32 次取最好的）的口径，而同期 GPT-4 被拿来对比的分数是单次的。

![GeminiUltra-MMLU跑分宣传图](https://n.uguu.se/PnwudVbQ.png)

（图源：量子位转引 Google）

这些数字未必造假，真正的问题是：**榜单成绩和你的任务之间的关系，比宣传语暗示的要远得多。**<!-- 判断句 -->

这里有一个连很多从业者都会忽略的研究结果：2025 年 Metr 的对照实验发现，AI 工具让资深开源开发者完成任务的时间平均**增加了** 19%。

而另一边，GitHub Copilot 2023 年的受控实验（MIT 等合作）里，实验组完成编程任务快了 55.8%；Microsoft Research 2024 年 4867 名开发者的大规模随机对照试验里，使用组每周完成的 pull request 多 26%。

同一个工具，新手快一半，老手反而慢。<!-- 判断句 -->这大概就是「真用起来不是一回事」最技术性的解释：宣传展示的是平均提升里最好看的那一段，而你不知道自己在分布的哪一头。

顺便说，从业者自己也不太信。Sonar 2026 年对一千多名专业开发者的调查里，96% 的人不完全信任 AI 生成代码的功能正确性，61% 的人认为 AI 经常产出「看着对但不靠谱」的代码。

## 三把尺子

所以怎么验？我的方法就三把尺子，全部可以在不依赖任何宣传材料的前提下使用。

**第一把：敢不敢给你看失败。**真牛的项目敢公布失败率、敢放翻车案例，因为它经得起看；只给你看精选 demo 的，无论多热闹，都按环节一处理。<!-- 判断句 -->

**第二把：敢不敢吃非预设输入。**把你自己最脏的数据、最绕的场景拿去试，不要用发布会那套环境。差距会在十分钟内自己显形。我们自己的经验是：demo 顺和上线顺之间，隔着一堆你事先不知道存在的边界条件，这个坑不亲手踩一遍，看一百条评测都发现不了。<!-- 判断句 -->

**第三把：责任写在哪里。**2024 年 2 月，加拿大不列颠哥伦比亚省民事仲裁庭在 Moffatt 诉 Air Canada 案里裁定：航司官网聊天机器人给乘客编造了不存在的丧亲退票政策，航司必须赔偿 812.02 加元。

仲裁庭驳回了「聊天机器人是独立法律实体」的抗辩，原文说：Air Canada 应该知道自己要对网站上所有信息负责。

![AirCanada官网帮助页面截图](https://d.uguu.se/mxGogflh.jpg)

（图源：香港文汇报）

这个案子之后，「出错算谁的」成了检验 AI 项目成色最狠的一招。<!-- 判断句 -->敢把责任条款写清楚的供应商，大概率对自己的能力有数；顾左右而言他的，你替他把 Air Canada 的判决书读一遍就行。

---

回到你的问题：为什么吹得天花乱坠，用起来不是一回事？

因为宣传卖的是「可能性」，你买的是「确定性」，中间隔着场景、兜底、榜单三个折损环节。<!-- 判断句 -->这不全是行业的错——技术早期本来就长这样；也不全是你的错——「你不会用」和「全是吹牛」是同一枚硬币的两面，都在替项目方省掉验收这个步骤。

工具牛不牛，demo 说了不算，宣传说了不算，你拿尺子量出来的才算。

---

信源：
- [Bloomberg：Google Gemini 演示视频争议（BBC 转述）](https://www.bbc.com/news/technology-67650807)、[Tom's Hardware 报道](https://www.tomshardware.com/news/google-gemini-ai-video-staged)
- [量子位：Gemini 演示「How it's Made」拆解](https://www.qbitai.com/2023/12/104425.html)
- [Medium：Devin Upwork 演示逐帧分析](https://machine-learning-made-simple.medium.com/did-the-makers-of-devin-ai-lie-about-their-capabilities-cdfa818d5fc2)、[量子位：Devin 争议](https://www.qbitai.com/2024/04/135315.html)、[Cognition SWE-bench 技术报告](https://cognition.com/blog/swe-bench-technical-report)
- [Bloomberg：Klarna 重新招聘人工客服（2025-05，多方转引）](https://www.thedailystar.net/tech-startup/news/ai-first-company-now-rehiring-human-staff-after-quality-drop-3892896)
- [The Verge：Rabbit R1 评测](https://www.theverge.com/2024/5/2/24147159/rabbit-r1-review-ai-gadget)（备用案例，正文未展开）
- [Air Canada 聊天机器人案（Moffatt v. Air Canada, 2024 BCCRT 149）](https://eu.36kr.com/en/3823087635599751)
- [GitHub Copilot 生产率受控实验（Peng et al., 2023）](https://arxiv.org/abs/2302.06590)、[Microsoft Research 大规模 RCT（InfoQ 报道）](https://app.daily.dev/posts/study-shows-ai-coding-assistant-improves-developer-productivity-ijrf4mgpl)、[Metr 2025 研究（InfoWorld）](https://www.infoworld.com/article/4020931/)、[Sonar 2026 开发者调查](https://www.sonarsource.com/blog/ai-coding-trust-gap/)
- 文中数据截至 2026 年 10 月 18 日

<!-- 图片溯源映射（发布前删除本段）
AI编程工作流/AI项目真牛还是吹牛/Gemini演示幕后-谷歌官方博客截图-量子位.png -> https://d.uguu.se/dthrkvqQ.png
AI编程工作流/AI项目真牛还是吹牛/Devin争议-逐帧打假视频ThisIsALie-量子位.webp -> https://n.uguu.se/GddZkXDp.webp
AI编程工作流/AI项目真牛还是吹牛/GeminiUltra-MMLU跑分宣传图-量子位.png -> https://n.uguu.se/PnwudVbQ.png
AI编程工作流/AI项目真牛还是吹牛/AirCanada官网帮助页面截图-文汇报.jpg -> https://d.uguu.se/mxGogflh.jpg
重传命令：node .agents/skills/image-host-upload/upload.js --force "AI编程工作流/AI项目真牛还是吹牛/zhihu-AI项目真牛还是吹牛-v1.md"
-->
