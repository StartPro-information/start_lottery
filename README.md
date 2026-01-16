# start_lottery
- 这是一个简易的抽奖系统，可用于年会抽奖活动，抽奖名单可以使用CSV文件导入或者扫二维码签到的方式导入，使用随机算法从名单池中抽取，支持随机动画演示、音效开关、奖品设置、领奖确认与取消、重抽、中奖名单导出等功能。

# 技术栈：
- TypeScript / NestJS / Next.js / PostgreSQL

# 主要功能
## 奖品设置
- 可以自定义活动名称、奖品类型和数量
<img width="1552" height="871" alt="image" src="https://github.com/user-attachments/assets/92227968-c034-4036-97b1-6cf71428607c" />
## 名单导入
- 提供三种名单导入方式参与抽奖
<img width="1552" height="871" alt="image" src="https://github.com/user-attachments/assets/67e840c2-b947-4a00-a622-3cd7e82b9569" />
<img width="1552" height="871" alt="image" src="https://github.com/user-attachments/assets/0c63ac7d-3767-4835-a4fc-fba9c5685a79" />

## 字段显示
- 抽奖人员将以卡片形式展示，卡片最多展示三个字段，可自行勾选
<img width="1560" height="891" alt="image" src="https://github.com/user-attachments/assets/cbb43c83-e6ff-4ff3-8eab-d5dff5240b18" />
- 配置完成之后，可以查看自己填写的内容，可以在这个页面保存配置或者修改配置
<img width="1560" height="891" alt="image" src="https://github.com/user-attachments/assets/7eb5b0ce-2810-46da-a7ee-5e88642cc6c3" />

## 锁定人员
- 进入主持台，就是抽奖的重点环节了，在抽奖之前需要【锁定人员】，锁定意味着不可以再加入新的人员，也不可以再调整活动设置内容；
<img width="1560" height="891" alt="image" src="https://github.com/user-attachments/assets/c1cda6ec-8941-4d0f-b22e-9a610ade7d4b" />
- 每轮抽奖之前，需要先设置【本轮抽取】的奖品和数量，每轮最多抽奖60人；
<img width="1560" height="891" alt="image" src="https://github.com/user-attachments/assets/e10e5d0a-0c3e-453c-af28-ba706252b2fe" />
## 随机动画抽奖
- 点击【开始抽取/停止抽取】按钮，即可抽奖，抽奖过程会随机切换动画
<img width="1560" height="891" alt="image" src="https://github.com/user-attachments/assets/6049393e-dfd4-4cae-8c6f-8f9f18b36134" />
<img width="1560" height="891" alt="image" src="https://github.com/user-attachments/assets/27bc0304-d3a2-4217-a0e2-e14ae668973c" />
<img width="1560" height="891" alt="image" src="https://github.com/user-attachments/assets/e4c8ad5c-e17c-43d2-9e72-2262791c2b9d" />
<img width="1560" height="891" alt="image" src="https://github.com/user-attachments/assets/5e6aba4a-ea49-4b0b-b466-6b0e3ffab541" />
- 如果抽奖活动的人数超过200人，则不会再显示姓名首字，而是进一步缩小成圆点
<img width="1560" height="891" alt="image" src="https://github.com/user-attachments/assets/de6ad3bf-03f0-4b8d-986d-14628c183ded" />
- 抽奖过程的音效，可以自行选择是否关闭（右侧有小喇叭）
- 停止抽取后，会随机选中卡片，并展示在页面中间
<img width="1560" height="891" alt="image" src="https://github.com/user-attachments/assets/85d1d55c-2012-4a46-aa0c-9a06e35393f6" />
## 确认领奖/取消领奖/重抽
- 可以勾选/取消勾选中奖人（默认是全部勾选的），确认领奖的名单会被扣除，不会再下一轮抽奖中再出现；
<img width="1560" height="891" alt="image" src="https://github.com/user-attachments/assets/9346bb27-f8d2-4db6-baa5-16400abde3d7" />
- 也可以直接整轮重抽
<img width="1560" height="891" alt="image" src="https://github.com/user-attachments/assets/71fde65d-69f8-4adc-8a85-d64152ff7909" />
## 获奖结果展示/获奖名单导出
- 所有奖品全部抽完，可以直接跳转到获奖统计页面
<img width="1560" height="891" alt="image" src="https://github.com/user-attachments/assets/2d7db8a5-3ffe-48d1-a9f4-c4fadd889fdc" />
- 可以直接导出中奖名单的CSV文件
## 其他注意事项
- 本系统无法实现一人中多个奖的功能，中奖名单将会在下一轮抽奖中被扣除；
- 如果页面中断，已抽中的奖项数据，仍然可以恢复，可以通过活动ID找回，比如，如创建活动时，显示的ID为：8fb1cc52-0f52-495c-a8d6-04f8b01ba195，那么可以通过这个ID找回
### 页面URL说明：
  - 获奖结果页面：http://your_host:3000/events/8fb1cc52-0f52-495c-a8d6-04f8b01ba195/results
  - 抽奖主持台页面：http://your_host:3000/events/8fb1cc52-0f52-495c-a8d6-04f8b01ba195/host

# 安装部署
## 依赖安装
- 安装 nodejs、postgreSQL（略），请自行设置数据库名称和账号、密码等；
- 数据库需要导入init.sql文件；

## 环境变量设置
## 进入项目目录
- 后端目录为 online/apps/open-api
```
修改环境变量
cd online/apps/open-api
vim .env
```
需要按照实际情况，写入数据库的账号，密码，数据库名，后端端口号以及随机字符串等，参照如下模板
```
PORT=3001
DATABASE_URL=postgresql://$USERNAME:$PASSWORD@127.0.0.1:5432/$DATABASE_NAME
TENANT_ID=default
ALLOW_QR_CHECKIN=true
ANTI_SPOOF_CHECKIN=true
CHECKIN_HMAC_SECRET=change_me
```
- 前端目录为 online/apps/web
```
修改环境变量
cd online/apps/web
vim .env
```
需要写入正确的后端URL端口号等信息
```
NEXT_PUBLIC_OPEN_API_BASE_URL=http://$YOUR_HOST_NAME:3001
NEXT_PUBLIC_TENANT_ID=default
```
## 系统运行
- 先运行后端，进入后端目录
```
cd online/apps/open-api/
npx prisma generate
npm start
```
- 再运行前端， 进入前端目录
```
cd online/apps/web
npm run build
npm start
```



## 其他
### 定期清理数据脚本
-在后端目录下，有一个scripts/maintenance目录，已经内置了清理脚本，直接设置系统定时任务即可
```
crontab -e
```
定时执行示例（每天凌晨 03 点清理 7 天内数据）：
```
0 3 * * * cd ~/start_lottery/online/apps/open-api && RETENTION_DAYS=7 npx ts-node scripts/maintenance/cleanup-events.ts >> /var/log/lottery-cleanup.log 2>&1
```


