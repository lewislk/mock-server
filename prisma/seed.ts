/**
 * Seed 脚本：插入 5 条 mock interface 示例。
 * 运行：pnpm db:seed
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SAMPLES = [
  {
    name: "用户详情",
    identifier: "user-detail",
    description: "根据 ID 获取用户完整信息",
    status: 1,
    thrift_def: `namespace java com.mock.user

struct UserDetail {
  1: required string id
  2: required string username
  3: optional string nickname
  4: required string email
  5: required i32 age
  6: optional list<Address> addresses
}

struct Address {
  1: required string province
  2: required string city
  3: required string detail
}`,
    json_template: JSON.stringify(
      {
        id: "@uuid",
        username: "@string(6,12)",
        nickname: "@cname",
        email: "@email",
        age: "@integer(18,60)",
        addresses: [
          {
            province: "@province",
            city: "@city",
            detail: "@csentence(5,15)",
          },
        ],
      },
      null,
      2,
    ),
    array_length: 2,
    status_code: 200,
    delay_ms: 0,
    error_rate: new Prisma.Decimal(0),
  },
  {
    name: "用户列表",
    identifier: "user-list",
    description: "分页返回用户基本信息列表",
    status: 1,
    thrift_def: null,
    json_template: JSON.stringify(
      {
        code: 200,
        message: "success",
        data: {
          total: "@integer(50,500)",
          items: [
            {
              id: "@uuid",
              nickname: "@cname",
              email: "@email",
            },
          ],
        },
      },
      null,
      2,
    ),
    array_length: 10,
    status_code: 200,
    delay_ms: 50,
    error_rate: new Prisma.Decimal(0),
  },
  {
    name: "商品列表",
    identifier: "product-list",
    description: "商品分页列表，支持筛选",
    status: 1,
    thrift_def: null,
    json_template: JSON.stringify(
      {
        items: [
          {
            id: "@uuid",
            title: "@ctitle(3,8)",
            price: "@float(1,1000,2,2)",
            stock: "@integer(0,500)",
            cover: '@image("200x200", "#4A90E2", "#fff", "png", "mock")',
          },
        ],
      },
      null,
      2,
    ),
    array_length: 5,
    status_code: 200,
    delay_ms: 0,
    error_rate: new Prisma.Decimal(0),
  },
  {
    name: "仪表盘统计",
    identifier: "dashboard-stats",
    description: "返回各类业务指标聚合数据",
    status: 0,
    thrift_def: null,
    json_template: JSON.stringify(
      {
        totalUsers: "@integer(10000,50000)",
        activeUsers: "@integer(1000,8000)",
        totalOrders: "@integer(500,5000)",
        revenue: "@float(10000,1000000,2,2)",
      },
      null,
      2,
    ),
    array_length: null,
    status_code: 200,
    delay_ms: 0,
    error_rate: new Prisma.Decimal(0),
  },
  {
    name: "错误响应示例",
    identifier: "error-500",
    description: "固定返回 500，用于前端错误处理测试",
    status: 1,
    thrift_def: null,
    json_template: JSON.stringify({ code: 500, message: "Mock error" }, null, 2),
    array_length: null,
    status_code: 500,
    delay_ms: 0,
    error_rate: new Prisma.Decimal(0),
  },
];

async function main() {
  console.log("Seeding database…");

  // 清空示例（仅删除示例标识，方便重复运行 seed）
  await prisma.mock_interface.deleteMany({
    where: { identifier: { in: SAMPLES.map((s) => s.identifier) } },
  });

  for (const item of SAMPLES) {
    await prisma.mock_interface.create({ data: item });
    console.log(`  + ${item.identifier}`);
  }

  // 初始化全局配置（仅在缺失时写入）
  const defaults = [
    { key: "array_length", value: "3" },
    { key: "locale", value: "zh-cn" },
    { key: "error_sim_enabled", value: "true" },
    { key: "log_retention_days", value: "7" },
  ];
  for (const d of defaults) {
    await prisma.global_config.upsert({
      where: { config_key: d.key },
      create: { config_key: d.key, config_value: d.value },
      update: {},
    });
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });