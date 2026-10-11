## 先把那个吓人的数据拆开：GitHub 三年半从 1 亿涨到 2.25 亿，但这 2.25 亿不是 2.25 亿开发者

GitHub 官方在 2023 年 1 月官宣全球用户突破 1 亿（[GitHub 官方博客](https://github.blog/news-insights/company-news/100-million-developers-and-counting/)），比原计划提前了两年。微软在 2026 年 7 月底的财报电话会上披露，这个数字已经到了 2.25 亿，GitHub Copilot 用户 5000 万，财富 500 强里超过 90% 的企业在用 GitHub，平台上三分之一的 pull request 已经涉及 AI agent（[微软 FY26 Q4 财报电话会实录](https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q4)）。

![github-100m-users-graph.png](https://s41.ax1x.com/2026/10/11/pnU4y0x.png)

*图源：GitHub 官方博客，用户增长曲线（截至 2023 年初官宣 1 亿）*

涨得确实猛。但有一个细节被所有转述轻轻带过了：**GitHub 自己在 [Octoverse 2024 报告](https://github.blog/news-insights/octoverse/octoverse-2024/)里写过一句大实话——"有迹象表明 AI 正在推高人们对软件开发的兴趣，但数据反映的全球增长激增，我们无法完全解释。"**

注意这个口径。2.25 亿是注册账户数，GitHub 从来没有公布过月活；调研机构 SlashData 估计全球职业开发者总共只有三千六百多万。就算一人多号、就算大半账户沉睡，"非职业写代码的人大量涌进来"这个判断，大方向错不了——但具体涌进来多少、留下来多少、一个月打开几次，没人知道，GitHub 自己也不知道。<!-- 判断句 -->

所以这个问题真正的分水岭不是"替代还是平权"，而是另一件事，我放到最后说。

---

先说平权这一半，因为它确实是真的。

我是写 Flutter 的，过去一年里我的代码基本是 AI 写的，我本人的工作流整个变了。而"不写代码的人开始涌进 GitHub"也不是一句口号——极客公园月初的观察报道就叫[《不写代码的人，正在涌入 GitHub》](https://finance.sina.cn/tech/2026-10-06/detail-iniuhcmn7154733.d.html)，里面记录的全是这种案例：有运营自己写工具汇总竞品价格，有人用自然语言搭个人知识库。这些东西放三年前，每一个都需要找人开发、报价、排期，大多数人想想就放弃了。**"想到"和"做到"之间的那条沟，AI 确实把它填平了大半。**<!-- 判断句 -->

这不是体感，数据也认：GitHub 在 [Octoverse 2025](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/) 里披露，近 80% 的新注册开发者在第一周内就在用 Copilot。工具上手的第一道坎，基本被抹掉了。

![github-new-devs-copilot.png](https://s41.ax1x.com/2026/10/11/pnU4DXR.png)

*图源：GitHub Octoverse 2025，近 80% 新开发者首周使用 Copilot*

---

再说替代这一半，它也是真的，只是替代的位置和多数人想的不一样。

被替代的不是"程序员"这个职业，是程序员工作里的一个中间层：**把需求翻译成代码的那层翻译工作**。<!-- 判断句 %}

以前一个想法变成软件，要经过"人懂需求 → 人翻译成代码 → 机器执行"。现在中间的翻译环节成本被打到接近零，两头反而更值钱了：一头是提得出好问题、想得出要做什么的人，一头是能判断 AI 做得对不对的人。

中间那层只会翻译的人，处境确实危险。

这和我自己的日常完全对得上。AI 帮我省掉的是打字的时间，一点没省掉判断的时间。[Stack Overflow 2025 年开发者调查](https://survey.stackoverflow.co/2025/ai)里有两个数字我印象很深：66% 的人说 AI 给的方案"差不多对但不完全对"，45.2% 的人说调试 AI 代码比自己写还耗时。

![so-survey-ai-frustrations.png](https://s41.ax1x.com/2026/10/11/pnU4sn1.png)

*图源：Stack Overflow Developer Survey 2025，开发者对 AI 工具的主要挫败感（N=31,476）*

![cursor-ide-tab-completion.png](https://s41.ax1x.com/2026/10/11/pnU4676.png)

*图源：IT之家转引 Cursor 官网，AI 编辑器 Tab 自动补全实机界面*

我自己的体验比这俩数字还拧巴一点：AI 写完功能、测试通过、验收也过，看起来万事大吉，但业务里真正的坑，不做到那一步根本不知道存在。真出问题的时候，我的活和三年前几乎一样——定位是哪个改动炸的、判断这个修复有没有引入新坑。变的只是我用来看代码的那只眼睛，从"写"变成了"验收"。

**所谓"替代"，替代的是执行；留下来的，是验收。**<!-- 判断句 -->

---

最后回到开头的数据。

GitHub 解释不了自己的用户激增，这句话本身就是答案：**"写软件"这件事的边界正在消失，平台连自己的用户画像都画不出来了。**<!-- 判断句 -->

所以替代和平权根本是同一回事的两面。翻译层被抽走，原来被这层门槛挡在外面的普通人进来了，这叫平权；原来靠这门翻译手艺吃饭的人发现手艺不值钱了，这叫替代。同一次降价，买家叫平权，卖家叫替代。

至于"创造力平权"这个说法，我倾向于再砍一刀：创造力从来没被垄断过，缺的从来是把它做出来的手段，AI 平权的是制作。但制作平权就已经够离谱了——过去几年死掉的开源项目开始重新更新，有想法的人第一次不用求程序员就能验证自己的想法，这个变化放在五年前说出去会被当成笑话。

GitHub 那 2.25 亿账户里有多少人会一直写下去，我说不好，GitHub 自己也说不好。但"想试试"的门槛没了，这件事已经发生了，而且回不去。

<!-- 图片溯源映射（发布前删除本段）
AI编程工作流/AI编程平权还是替代/github-100m-users-graph.png -> https://s41.ax1x.com/2026/10/11/pnU4y0x.png
AI编程工作流/AI编程平权还是替代/github-new-devs-copilot.png -> https://s41.ax1x.com/2026/10/11/pnU4DXR.png
AI编程工作流/AI编程平权还是替代/so-survey-ai-frustrations.png -> https://s41.ax1x.com/2026/10/11/pnU4sn1.png
AI编程工作流/AI编程平权还是替代/cursor-ide-tab-completion.png -> https://s41.ax1x.com/2026/10/11/pnU4676.png
重传命令：node .agents/skills/image-host-upload/upload.js --force "AI编程工作流/AI编程平权还是替代/zhihu-AI编程平权还是替代-v1.md"
-->
