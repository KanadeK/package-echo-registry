# Package Echo Registry

Package Echo Registry 用于把包或 SDK 的版本变化追踪到下游 consumer、示例和迁移任务。
它面向 SDK 团队与 monorepo 维护者，重点提供可定位到源码文件的证据，而不是只复述发布说明。

v0.1.0 将提供本地优先的 Node CLI 与静态 React 报告查看器。分析无需访问公共包注册表，
也不会上传仓库源码。

## v0.1.0 功能合同

- 导入 package manifest、Changesets 与 API Extractor 报告快照。
- 构建 package 到 consumer 再到 example 的影响路径，并附带源码证据。
- 检测 breaking API、peer dependency 与示例用法风险。
- 以 JSON 和 Markdown 导出迁移清单。

## 当前状态

仓库当前已经完成版本化质量门槛、项目政策、架构边界以及开发前的公开仓库抽样检索。
只有在命令和截图由真实实现生成后，才会把它们加入使用文档。

## 公开仓库抽样

公开仓库抽样检索未发现同名且高度同构的活跃项目。相邻工具主要覆盖版本管理、
独立 API 兼容性、依赖可视化或构建编排。完整记录见
[docs/COMPETITOR_SCAN.md](docs/COMPETITOR_SCAN.md)。

## 隐私

项目采用本地优先方式。后续报告只包含仓库相对路径与公开 API 签名，不包含文件全文、
凭据、环境文件或 GitHub Token。详见
[docs/PRIVACY_AND_SECURITY.md](docs/PRIVACY_AND_SECURITY.md)。

## 许可证

[MIT](LICENSE)
