// ============================================================
// MongoDB connection layer (official `mongodb` driver)
//
// - یک MongoClient برای کل پروسه (Next.js در dev چند بار ماژول را
//   reload می‌کند، برای همین روی globalThis کش می‌شود).
// - `collections()` همه‌ی کالکشن‌های تایپ‌شده را یک‌جا برمی‌گرداند.
// - ایندکس‌ها یک بار در اولین اتصال ساخته می‌شوند.
// - `runInTransaction()` روی MongoDB واقعی (replica set) تراکنش واقعی
//   می‌سازد و روی سرورهای ساده‌تر به‌صورت ترتیبی اجرا می‌شود.
// ============================================================

import {
  Collection,
  Db,
  MongoClient,
  ObjectId,
  type ClientSession,
  type Document,
} from "mongodb";
import {
  COLLECTIONS,
  type CategoryDoc,
  type CounterDoc,
  type CustomerDoc,
  type ExpenseCategoryDoc,
  type ExpenseDoc,
  type InventoryMovementDoc,
  type InvoiceDoc,
  type ProductDoc,
  type ScanEventDoc,
  type StoreDoc,
  type TransactionDoc,
  type UserDoc,
} from "./models";

/** همه‌ی کالکشن‌های برنامه، تایپ‌شده */
export interface Collections {
  stores: Collection<StoreDoc>;
  users: Collection<UserDoc>;
  categories: Collection<CategoryDoc>;
  products: Collection<ProductDoc>;
  customers: Collection<CustomerDoc>;
  invoices: Collection<InvoiceDoc>;
  expenseCategories: Collection<ExpenseCategoryDoc>;
  expenses: Collection<ExpenseDoc>;
  transactions: Collection<TransactionDoc>;
  inventoryMovements: Collection<InventoryMovementDoc>;
  scanEvents: Collection<ScanEventDoc>;
  counters: Collection<CounterDoc>;
}

const FALLBACK_URI = "mongodb://127.0.0.1:27017/mystore?directConnection=true";
const FALLBACK_DB = "mystore";

export function mongoUri(): string {
  return process.env.MONGODB_URI || process.env.DATABASE_URL || FALLBACK_URI;
}

/** نام دیتابیس از URI (یا از MONGODB_DB) */
export function mongoDbName(): string {
  if (process.env.MONGODB_DB) return process.env.MONGODB_DB;
  const uri = mongoUri().split("?")[0];
  const schemeEnd = uri.indexOf("://");
  const slash = uri.indexOf("/", schemeEnd === -1 ? 0 : schemeEnd + 3);
  const fromUri = slash === -1 ? "" : uri.slice(slash + 1);
  return fromUri || FALLBACK_DB;
}

type MongoGlobal = {
  __mongoClientPromise?: Promise<MongoClient>;
  __mongoCollections?: Promise<Collections>;
  __mongoTxSupported?: boolean;
};

const g = globalThis as unknown as MongoGlobal;

function buildClient(): MongoClient {
  return new MongoClient(mongoUri(), {
    // در dev سرور ممکن است دیر بالا بیاید؛ کمی صبورتر باشیم.
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? 10_000),
    maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE ?? 20),
    retryWrites: true,
  });
}

export function getClient(): Promise<MongoClient> {
  if (!g.__mongoClientPromise) {
    // اگر اتصال شکست خورد، Promiseِ خطا را کش نکن؛ وگرنه بعد از
    // بالا آمدن دیتابیس هم برنامه تا ری‌استارت بعدی «قطع» می‌ماند.
    g.__mongoClientPromise = buildClient()
      .connect()
      .catch((error) => {
        g.__mongoClientPromise = undefined;
        throw error;
      });
  }
  return g.__mongoClientPromise;
}

/**
 * یک ping سریع به دیتابیس — برای /api/health و پیام‌های راهنمای خطا.
 *
 * - اتصال خراب را کش نمی‌کند (درخواست بعدی دوباره تلاش می‌کند)
 * - با تایم‌اوت کوتاه، تا وقتی سرور Mongo بالا نیست صفحه‌ها معطل نمانند.
 *   (serverSelectionTimeoutMS پیش‌فرض ۱۰ ثانیه است؛ اینجا زودتر تسلیم می‌شویم)
 */
export async function pingDatabase(
  timeoutMs = 3000,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const probe = (async () => {
      const client = await getClient();
      await client.db(mongoDbName()).command({ ping: 1 });
    })();
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`پاسخی از دیتابیس نیامد (بیش از ${timeoutMs} میلی‌ثانیه)`)),
        timeoutMs,
      );
    });
    await Promise.race([probe, timeout]);
    return { ok: true };
  } catch (error) {
    g.__mongoClientPromise = undefined;
    g.__mongoCollections = undefined;
    return { ok: false, error: (error as Error)?.message ?? String(error) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(mongoDbName());
}

/** کالکشن‌های تایپ‌شده — اولین فراخوانی ایندکس‌ها را هم می‌سازد. */
export function collections(): Promise<Collections> {
  if (!g.__mongoCollections) {
    // مثل getClient: خطا کش نمی‌شود تا ارتباط بعد از بالا آمدن دیتابیس برگردد.
    g.__mongoCollections = initCollections().catch((error) => {
      g.__mongoCollections = undefined;
      throw error;
    });
  }
  return g.__mongoCollections;
}

async function initCollections(): Promise<Collections> {
  const database = await getDb();

  const cols: Collections = {
    stores: database.collection<StoreDoc>(COLLECTIONS.stores),
    users: database.collection<UserDoc>(COLLECTIONS.users),
    categories: database.collection<CategoryDoc>(COLLECTIONS.categories),
    products: database.collection<ProductDoc>(COLLECTIONS.products),
    customers: database.collection<CustomerDoc>(COLLECTIONS.customers),
    invoices: database.collection<InvoiceDoc>(COLLECTIONS.invoices),
    expenseCategories: database.collection<ExpenseCategoryDoc>(COLLECTIONS.expenseCategories),
    expenses: database.collection<ExpenseDoc>(COLLECTIONS.expenses),
    transactions: database.collection<TransactionDoc>(COLLECTIONS.transactions),
    inventoryMovements: database.collection<InventoryMovementDoc>(COLLECTIONS.inventoryMovements),
    scanEvents: database.collection<ScanEventDoc>(COLLECTIONS.scanEvents),
    counters: database.collection<CounterDoc>(COLLECTIONS.counters),
  };

  await ensureIndexes(database).catch((error) => {
    console.warn("[db] ساخت ایندکس‌ها ناموفق بود (برنامه ادامه می‌یابد):", error?.message ?? error);
  });

  return cols;
}

/**
 * ایندکس‌ها = همان چیزی که در دیتابیس‌های رابطه‌ای «unique constraint»
 * و «index» بود. در MongoDB صریحاً ساخته می‌شوند.
 */
export async function ensureIndexes(database: Db): Promise<void> {
  const safe = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (error) {
      console.warn("[db] index:", (error as Error)?.message ?? error);
    }
  };

  await safe(() => database.collection(COLLECTIONS.stores).createIndex({ slug: 1 }, { unique: true }));
  await safe(() => database.collection(COLLECTIONS.users).createIndex({ email: 1 }, { unique: true }));
  await safe(() => database.collection(COLLECTIONS.users).createIndex({ storeId: 1 }));

  await safe(() =>
    database.collection(COLLECTIONS.categories).createIndex({ storeId: 1, slug: 1 }, { unique: true }),
  );
  await safe(() =>
    database.collection(COLLECTIONS.products).createIndex({ storeId: 1, barcode: 1 }, { unique: true }),
  );
  await safe(() => database.collection(COLLECTIONS.products).createIndex({ storeId: 1, name: 1 }));
  await safe(() => database.collection(COLLECTIONS.products).createIndex({ categoryId: 1 }));

  await safe(() => database.collection(COLLECTIONS.customers).createIndex({ storeId: 1, name: 1 }));

  await safe(() =>
    database.collection(COLLECTIONS.invoices).createIndex({ storeId: 1, number: 1 }, { unique: true }),
  );
  await safe(() => database.collection(COLLECTIONS.invoices).createIndex({ storeId: 1, createdAt: -1 }));
  await safe(() => database.collection(COLLECTIONS.invoices).createIndex({ storeId: 1, status: 1 }));

  await safe(() =>
    database
      .collection(COLLECTIONS.expenseCategories)
      .createIndex({ storeId: 1, name: 1 }, { unique: true }),
  );
  await safe(() => database.collection(COLLECTIONS.expenses).createIndex({ storeId: 1, date: -1 }));

  await safe(() => database.collection(COLLECTIONS.transactions).createIndex({ storeId: 1, date: -1 }));
  await safe(() => database.collection(COLLECTIONS.transactions).createIndex({ storeId: 1, account: 1 }));
  await safe(() => database.collection(COLLECTIONS.transactions).createIndex({ refType: 1, refId: 1 }));

  await safe(() =>
    database.collection(COLLECTIONS.inventoryMovements).createIndex({ productId: 1, createdAt: -1 }),
  );

  await safe(() => database.collection(COLLECTIONS.scanEvents).createIndex({ storeId: 1, createdAt: -1 }));
  await safe(() => database.collection(COLLECTIONS.scanEvents).createIndex({ barcode: 1 }));
}

// ------------------------------------------------------------
// ObjectId helpers
// ------------------------------------------------------------

/**
 * ObjectId «هیچ» — یک شناسه‌ی معتبر ولی بی‌معنی که به هیچ داکیومنتی
 * نمی‌خورد. وقتی id نامعتبر باشد، کوئری به‌جای خطا دادن نتیجه‌ی خالی
 * برمی‌گرداند (مثلاً وقتی کسی URL را دست‌کاری کند).
 */
export const NIL_OBJECT_ID = new ObjectId("000000000000000000000000");

/**
 * تبدیل رشته‌ی id به ObjectId — همیشه یک ObjectId برمی‌گرداند.
 * برای فیلدهای اجباری (مثل `_id` و `storeId`) استفاده می‌شود.
 */
export function oid(id: string | ObjectId | null | undefined): ObjectId {
  if (!id) return NIL_OBJECT_ID;
  if (id instanceof ObjectId) return id;
  return ObjectId.isValid(id) ? new ObjectId(id) : NIL_OBJECT_ID;
}

/**
 * مثل `oid` ولی برای فیلدهای «اختیاری» (categoryId، customerId، …)
 * که واقعاً می‌توانند null باشند.
 */
export function oidOrNull(id: string | ObjectId | null | undefined): ObjectId | null {
  if (!id) return null;
  if (id instanceof ObjectId) return id;
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

/** مثل `oid` ولی برای جاهایی که id حتماً باید معتبر باشد. */
export function oidOrThrow(id: string | ObjectId | null | undefined, label = "شناسه"): ObjectId {
  if (!id) throw new Error(`${label} نامعتبر است`);
  if (id instanceof ObjectId) return id;
  if (!ObjectId.isValid(id)) throw new Error(`${label} نامعتبر است`);
  return new ObjectId(id);
}

/** id معتبر → رشته‌ی hex؛ در غیر این صورت رشته‌ی خالی. */
export function idOrEmpty(id: string | ObjectId | null | undefined): string {
  if (!id) return "";
  if (id instanceof ObjectId) return id.toHexString();
  return ObjectId.isValid(id) ? String(id) : "";
}

/** مثل `idOrEmpty` ولی اگر id نامعتبر باشد خطا می‌دهد. */
export function idOrThrow(id: string | ObjectId | null | undefined, label = "شناسه"): string {
  const value = idOrEmpty(id);
  if (!value) throw new Error(`${label} نامعتبر است`);
  return value;
}

/** ObjectId → رشته‌ی hex (برای JSON و DTOها) */
export function idOf(value: ObjectId | string | null | undefined): string {
  if (!value) return "";
  return value instanceof ObjectId ? value.toHexString() : String(value);
}

// ------------------------------------------------------------
// Transactions
// ------------------------------------------------------------

const TX_MODE = (process.env.MONGODB_TRANSACTIONS ?? "auto") as "auto" | "on" | "off";

/**
 * آیا سرور جاری از تراکنش چند داکیومنتی پشتیبانی می‌کند؟
 * (MongoDB برای این کار به replica set نیاز دارد.)
 */
async function transactionsSupported(client: MongoClient): Promise<boolean> {
  if (TX_MODE === "off") return false;
  if (TX_MODE === "on") return true;
  if (typeof g.__mongoTxSupported === "boolean") return g.__mongoTxSupported;

  const database = client.db(mongoDbName());
  const probe = database.collection("__tx_probe");
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      await probe.insertOne({ ping: 1 }, { session });
      await probe.deleteMany({}, { session });
    });
    g.__mongoTxSupported = true;
  } catch {
    g.__mongoTxSupported = false;
  } finally {
    await session.endSession().catch(() => {});
  }
  return g.__mongoTxSupported;
}

/**
 * اجرای چند نوشتن پشت سر هم.
 * روی MongoDB با replica set → واقعاً اتمیک (یا همه، یا هیچ‌کدام).
 * روی سرورهای بدون پشتیبانی تراکنش → به‌ترتیب اجرا می‌شود.
 *
 * `session` را به همه‌ی عملیات‌های داخل `fn` پاس بدهید:
 *   col.updateOne(filter, update, { session })
 */
export async function runInTransaction<T>(
  fn: (session: ClientSession | undefined) => Promise<T>,
): Promise<T> {
  const client = await getClient();
  const supported = await transactionsSupported(client);
  if (!supported) return fn(undefined);

  const session = client.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession().catch(() => {});
  }
}

// ------------------------------------------------------------
// شماره‌گذاری فاکتور (اتمیک)
// ------------------------------------------------------------

/**
 * شماره‌ی بعدی یک ردیف (مثلاً فاکتور) — با `$inc` اتمیک است،
 * پس دو درخواست همزمان شماره‌ی تکراری نمی‌گیرند.
 */
export async function nextSequence(
  cols: Pick<Collections, "counters">,
  storeId: string | ObjectId,
  kind: string,
  session?: ClientSession,
): Promise<number> {
  const key = `${idOf(storeId)}:${kind}`;
  const doc = await cols.counters.findOneAndUpdate(
    { _id: key } as unknown as Document,
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", session },
  );
  return doc?.seq ?? 1;
}

/** بستن اتصال (برای اسکریپت‌ها) */
export async function disconnect(): Promise<void> {
  const promise = g.__mongoClientPromise;
  g.__mongoClientPromise = undefined;
  g.__mongoCollections = undefined;
  if (promise) await (await promise).close().catch(() => {});
}
