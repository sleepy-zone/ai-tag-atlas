# Tag Atlas · AI 绘图标签图鉴

把素材库里的中英标签做成一个可搜索、可拼提示词的独立站点。零依赖、纯静态，直接部署到 GitHub Pages / Cloudflare Pages。

- **373 个标签**，29 个分类：服装、材质、颜色、领口、袖口、鞋、体型、发型、表情、手部、姿势、构图、场景、灯光。
- 内部保留 **178 条 Danbooru 规范标签映射**（只存在数据里，不在界面展示）。
- **12 组场景配方**：白底棚拍、暗调肖像、居家窗光、黄昏海边、夜景霓虹、古风庭院、森林晨雾、街头通勤、复古巷拍、仙侠幻境、咖啡馆一角、舞台剪影；可拖动、点箭头或按方向键左右翻页。
- 中文 / 英文 / 别名三种检索；点标签进工作台，自动按「颜色 → 材质 → 款式 → 表情 → 构图 → 场景 → 灯光」排序生成提示词。
- 「复制提示词」和「复制链接」放在同一排；复制提示词时会自动带上负面提示词。
- 画风后缀是一个中英对照下拉，14 个预设 + 「无（留空）」；不再提供自由输入。
- 深色 / 浅色主题；桌面三栏、移动端底部工作台；URL 分享选中标签。

## 本地运行

```bash
cd ai-tag-atlas
python3 -m http.server 8899
# http://127.0.0.1:8899
```

也可以直接双击 `index.html`：数据以 `data/*.js` 全局变量加载，不依赖 `fetch`。

## 数据来源

| 数据 | 来源 | 许可 |
| --- | --- | --- |
| `data/tags.js` | `../ai-ref-library-cn/data/tags.json`（v3） | 术语整理；图片不在本站 |
| `data/recipes.js` | `../ai-ref-library-cn/data/recipes.json` | 同上 |
| 服装标签 | 本站服装库 1,407 套的 86 个中英标签 | 随站点数据 |
| 场景 / 灯光 | Shisei `data/scenes.json` / `data/lights.json` | CC0 1.0 |
| 术语参考 | LumiCanvass 公开贴图的标签文字 | 仅术语，不含图片 |
| Danbooru 映射 | [a1111-sd-webui-tagcomplete](https://github.com/DominikDoom/a1111-sd-webui-tagcomplete) 的 `danbooru.csv` | 只读参考 |

同步数据（在 `ai-ref-library-cn` 改完词库后）：

```bash
node tools/sync-data.mjs
```

会重新生成 `data/tags.js` 与 `data/recipes.js`。

## 结构

```
ai-tag-atlas/
├── index.html
├── assets/
│   ├── style.css
│   └── app.js
├── data/
│   ├── tags.js       # window.TAG_ATLAS
│   └── recipes.js    # window.TAG_RECIPES
├── tools/
│   └── sync-data.mjs
├── LICENSE
└── README.md
```

## 部署

站点没有构建步骤，把整个目录上传/推到静态托管即可：

- **GitHub Pages**：作为独立仓库，Pages 选 `main` / root。
- **Cloudflare Pages**：build command 留空，输出目录 `/`。

如果部署在子路径（例如 `/tag-atlas/`），资源使用相对路径，无需改配置。

## 自定义

- **加标签**：改 `../ai-ref-library-cn/tools/build-tags.mjs`，重新生成词库，再跑 `node tools/sync-data.mjs`。
- **改配方**：改 `../ai-ref-library-cn/data/recipes.json`，同步。
- **改视觉**：`assets/style.css` 顶部的 CSS 变量（深/浅两套 token）。
- **改排序**：`assets/app.js` 的 `PROMPT_ORDER`。

## 许可

- 站点代码：MIT（见 `LICENSE`）。
- 标签术语：通用词汇整理；LumiCanvass 的图片版权归作者，本站不含其图片。
- Shisei 场景 / 灯光数据：CC0 1.0。
- Danbooru 标签映射：仅作名称参考。
