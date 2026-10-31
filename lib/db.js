const { neon } = require('@neondatabase/serverless');

let _sql;
function getSql() {
  if (!process.env.DATABASE_URL) throw new Error('Липсва променлива DATABASE_URL');
  return (_sql = _sql || neon(process.env.DATABASE_URL));
}

// [заглавие, сделка, тип, град, квартал, кратко, описание, цена, площ, етаж, спални, строителство, обзаведен, ново строителство]
const SEED = [
  ['Двустаен с тераса, Лозенец', 'sale', '2-стаен', 'София', 'Лозенец', '2-стаен · 68 м² · 4 ет.', 'Светъл апартамент в кооперация със зелен двор, на 5 минути пеша от метростанция и парк. Южно изложение, голяма тераса, нова дограма и климатик. Подходящ както за живеене, така и за инвестиция.', 168000, 68, '4', 1, 'Тухла', true, false],
  ['Тристаен, Младост 3', 'sale', '3-стаен', 'София', 'Младост 3', '3-стаен · 94 м² · 6 ет.', 'Просторен тристаен апартамент след основен ремонт. Две спални, дневна с кухненски бокс, два санитарни възела. Близо до училища, магазини и спирка на метрото.', 142000, 94, '6', 2, 'Панел', false, false],
  ['Къща с двор, Бояна', 'sale', 'Къща', 'София', 'Бояна', 'Къща · 210 м² · 2 000 м² двор', 'Самостоятелна къща на три нива с ландшафтен двор, гараж за два автомобила и камина. Тиха улица в полите на планината, на 15 минути от центъра.', 420000, 210, 'Партер', 4, 'Тухла', false, false],
  ['Едностаен, Тракия', 'sale', '1-стаен', 'Пловдив', 'Тракия', '1-стаен · 46 м² · 3 ет.', 'Уютно студио в кв. Тракия, подходящо за млада двойка или за отдаване под наем. Доставя се с кухненско обзавеждане. Сградата е с изграден топлоизолационен слой.', 69000, 46, '3', 1, 'Тухла', true, false],
  ['Тристаен, Център', 'sale', '3-стаен', 'Пловдив', 'Център', '3-стаен · 102 м² · 2 ет.', 'Автентичен апартамент с високи тавани в центъра на града, на крачка от Главната. Запазен паркет, две спални и просторна дневна.', 155000, 102, '2', 2, 'Тухла', false, false],
  ['Апартамент, Бриз', 'sale', '2-стаен', 'Варна', 'Бриз', '2-стаен · 74 м² · 5 ет.', 'Двустаен апартамент с частична гледка към морето, на 10 минути от плажа. Обзаведен, с паркомясто в двора на сградата.', 132000, 74, '5', 1, 'Тухла', true, false],
  ['Къща с морска гледка, Виница', 'sale', 'Къща', 'Варна', 'Виница', 'Къща · 160 м² · гледка море', 'Модерна къща с панорамна тераса и басейн. Три спални, просторна дневна, ново строителство с Акт 16.', 295000, 160, 'Партер', 3, 'Тухла', false, false],
  ['Двустаен, Сарафово', 'sale', '2-стаен', 'Бургас', 'Сарафово', '2-стаен · 63 м² · 1 ет.', 'Приземен апартамент с частен двор, на 300 м от морето. Идеален за целогодишно живеене или като летен имот.', 88000, 63, '1', 1, 'Тухла', false, false],
  ['Нов тристаен в затворен комплекс, Овча купел', 'sale', '3-стаен', 'София', 'Овча купел', '3-стаен · 98 м² · 4 ет.', 'Апартамент в нов комплекс със закрита охрана, детска площадка и подземен паркинг. Предаване с Акт 16 през следващото тримесечие. Възможност за ипотечно финансиране.', 189000, 98, '4', 2, 'ЕПК', false, true],
  ['Двустаен в нова сграда, Каменица', 'sale', '2-стаен', 'Пловдив', 'Каменица 2', '2-стаен · 72 м² · 5 ет.', 'Нова сграда с асансьор, видеонаблюдение и подземен гараж. Апартаментът се предава на ключ, с изградени ВиК и ел. инсталации.', 124000, 72, '5', 1, 'ЕПК', false, true],
  ['Апартамент до морето, Левски', 'sale', '2-стаен', 'Варна', 'Левски', '2-стаен · 66 м² · 3 ет.', 'Нов комплекс на 200 м от плажа с басейн и фитнес. Предлага се обзаведен, готов за настаняване.', 149000, 66, '3', 1, 'ЕПК', true, true],
  ['Мезонет с две тераси, Център', 'sale', 'Мезонет', 'Бургас', 'Център', 'Мезонет · 135 м² · 5–6 ет.', 'Луксозен мезонет в сграда от 2022 г. със студио и спално ниво. Две тераси, паркомясто и мазе.', 235000, 135, '5', 3, 'Тухла', true, false],
  ['Двустаен под наем, Витоша', 'rent', '2-стаен', 'София', 'Витоша', '2-стаен · 58 м² · 3 ет.', 'Напълно обзаведен апартамент в тиха улица, до метро и магазини. Договор за минимум 12 месеца, депозит един месец.', 750, 58, '3', 1, 'Тухла', true, false],
  ['Офис под наем, Център', 'rent', 'Офис', 'Пловдив', 'Център', 'Офис · 80 м² · 2 ет.', 'Светъл офис с три работни помещения, заседателна зала и санитарен възел. Климатизиран, с бърз интернет и два паркоместа.', 1100, 80, '2', 0, 'Тухла', true, false],
  ['Магазин на оживена улица', 'rent', 'Магазин', 'Варна', 'Център', 'Магазин · 45 м² · партер', 'Търговско помещение с витрина на пешеходна зона. Висок трафик целогодишно, подготвено за веднага стартиране на дейност.', 1800, 45, 'Партер', 0, 'Тухла', false, false],
  ['Парцел за жилищно строителство', 'sale', 'Парцел', 'Бургас', 'Ветрен', 'Парцел · 3 000 м²', 'Равен парцел с лице на асфалтов път, ток и вода на границата. Регулиран, подходящ за еднофамилни къщи.', 75000, 3000, 'Партер', 0, '', false, false],
];


// Демо проекти за ново строителство: [име, град, квартал, слоган, описание, етап]
const PROJECTS = [
  ['Резиденс Паркова', 'София', 'Овча купел', 'Затворен комплекс до парка', 'Нов жилищен комплекс със закрита охрана, детски площадки, зелени дворове и подземен паркинг. Апартаменти с просторни тераси и качествени довършителни работи, изградени от строител с над 15 години опит.', 'Преди Акт 14'],
  ['Каменица Хилс', 'Пловдив', 'Каменица 2', 'Нова сграда с асансьор и гараж', 'Модерна жилищна сграда с видеонаблюдение, подземен гараж и озеленени общи части. Гъвкаво разсрочено плащане и възможност за ипотечно финансиране.', 'В строеж'],
  ['Морска Градина', 'Варна', 'Левски', 'На 200 метра от плажа', 'Комплекс със собствен басейн и фитнес, предлагащ жилища за целогодишно живеене и инвестиция. Апартаментите се предават с Акт 16 и могат да бъдат обзаведени.', 'Акт 16'],
];
const PROJECT_OF = { 'Нов тристаен в затворен комплекс, Овча купел': 0, 'Двустаен в нова сграда, Каменица': 1, 'Апартамент до морето, Левски': 2 };

// Демо статии: [slug, заглавие, увод, текст]
const POSTS = [
  ['kak-da-prodadem-imot-badzhe', 'Как да продадем имот бързо и на добра цена', 'Пет практични стъпки, които скъсяват времето до сделка.',
   'Определянето на правилната цена е най-важната стъпка. Завишена оферта отблъсква купувачите през първите седмици, когато интересът е най-голям, а занижената ви лишава от пари.\n\nПодгответе документите предварително: нотариален акт, скица, удостоверение за тежести и данъчна оценка. Така избягвате забавяне в последния момент.\n\nПредставете имота добре: почистено и светло помещение, добри снимки и точно описание. Малки поправки като боядисване и смяна на счупени елементи често се отплащат многократно.\n\nБъдете гъвкави при огледите и отговаряйте бързо на запитванията. Купувачите често разглеждат няколко имота в един ден и избират този, при който комуникацията е най-ясна.\n\nНакрая, работете с брокер, който познава района и може да води преговорите вместо вас.'],
  ['dokumenti-za-pokupka', 'Какви документи са нужни при покупка на жилище', 'Контролен списък за купувача преди подписване на предварителен договор.',
   'Преди да платите капаро, поискайте да видите нотариалния акт на продавача и скица или схема от кадастъра. Те потвърждават собствеността и границите на имота.\n\nУдостоверението за тежести показва дали има ипотека, възбрана или други ограничения. Данъчната оценка е нужна за изчисляване на местния данък и нотариалната такса.\n\nАко купувате с ипотечен кредит, банката ще направи собствена оценка на имота и ще изиска допълнителни документи. Заложете за това няколко седмици.\n\nПредварителният договор трябва да съдържа ясни срокове, цена, начин на плащане и условия при отказ на някоя от страните.'],
  ['ipoteka-saveti', 'Ипотечен кредит: на какво да обърнем внимание', 'Лихвата е само част от разходите – вижте какво още влияе върху вноската.',
   'Освен лихвата, сравнявайте ГПР, таксите за разглеждане, оценка и вписване на ипотеката, както и изискванията за застраховки.\n\nСамоучастието обикновено е от 10 до 20 процента от цената. По-голямото самоучастие намалява вноската и често води до по-добри условия.\n\nПроверете дали има възможност за предсрочно погасяване без такса и какво се случва при промяна на лихвения процент.\n\nИзползвайте нашия калкулатор, за да сравните различни срокове – по-дългият срок намалява вноската, но увеличава общата сума на лихвите.'],
  ['novo-stroitelstvo-ili-staro', 'Ново или старо строителство: какво да изберем', 'Сравнение на предимствата и рисковете на двата варианта.',
   'Новото строителство предлага модерни планировки, енергийна ефективност и често гаражи или паркоместа. Купувачът може да избира етаж, изложение и да разпредели вътрешното пространство.\n\nПредимствата на старото строителство са установените квартали, развита инфраструктура и по-големи квадратури за същата цена.\n\nПри имот на зелено проверете репутацията на строителя, разрешителните и етапа на строителство. Обърнете внимание на графика на плащанията и на гаранциите в договора.\n\nНезависимо от избора, огледайте имота лично и поискайте всички документи преди плащане.'],
];

const NEW_COLS = `
  ADD COLUMN IF NOT EXISTS deal TEXT NOT NULL DEFAULT 'sale',
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS district TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS area INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS floor TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bedrooms INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS construction TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS furnished BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS new_construction BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS images TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS project_id INTEGER`;

function seedStatements(sql) {
  const props = SEED.map((r) => sql`
    INSERT INTO properties (title, deal, type, city, district, details, description, price, area, floor, bedrooms, construction, furnished, new_construction)
    VALUES (${r[0]}, ${r[1]}, ${r[2]}, ${r[3]}, ${r[4]}, ${r[5]}, ${r[6]}, ${r[7]}, ${r[8]}, ${r[9]}, ${r[10]}, ${r[11]}, ${r[12]}, ${r[13]})`);
  return props;
}
function projectStatements(sql) {
  const p = PROJECTS.map((r) => sql`
    INSERT INTO projects (name, city, district, tagline, description, stage) VALUES (${r[0]}, ${r[1]}, ${r[2]}, ${r[3]}, ${r[4]}, ${r[5]})`);
  const link = Object.entries(PROJECT_OF).map(([title, i]) => sql`
    UPDATE properties SET project_id = (SELECT id FROM projects WHERE name = ${PROJECTS[i][0]} ORDER BY id DESC LIMIT 1)
    WHERE title = ${title} AND project_id IS NULL`);
  return [...p, ...link];
}
function postStatements(sql) {
  return POSTS.map((r) => sql`
    INSERT INTO posts (slug, title, excerpt, body) VALUES (${r[0]}, ${r[1]}, ${r[2]}, ${r[3]}) ON CONFLICT (slug) DO NOTHING`);
}

// Добавя примерните данни (вика се от админ панела)
async function seedDemo() {
  const sql = getSql();
  await sql.transaction([...seedStatements(sql), ...projectStatements(sql)]);
  await sql.transaction(postStatements(sql));
  return SEED.length;
}

let ready;
function ensureSchema() {
  if (ready) return ready;
  ready = (async () => {
    const sql = getSql();
    const [{ exists }] = await sql`SELECT to_regclass('public.properties') IS NOT NULL AS exists`;

    await sql.transaction([
      sql`CREATE TABLE IF NOT EXISTS properties (
        id         SERIAL PRIMARY KEY,
        title      TEXT        NOT NULL,
        city       TEXT        NOT NULL,
        details    TEXT        NOT NULL DEFAULT '',
        price      INTEGER     NOT NULL CHECK (price >= 0),
        image_url  TEXT        NOT NULL DEFAULT '',
        published  BOOLEAN     NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      sql.query(`ALTER TABLE properties ${NEW_COLS}`),
      sql`UPDATE properties SET type = split_part(details, ' · ', 1) WHERE type = '' AND details <> ''`,
      sql`CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        email         TEXT        NOT NULL UNIQUE,
        name          TEXT        NOT NULL DEFAULT '',
        password_hash TEXT        NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      sql`CREATE TABLE IF NOT EXISTS favorites (
        user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        property_id INTEGER     NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        price_saved INTEGER     NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, property_id)
      )`,
      sql`CREATE TABLE IF NOT EXISTS projects (
        id          SERIAL PRIMARY KEY,
        name        TEXT        NOT NULL,
        city        TEXT        NOT NULL,
        district    TEXT        NOT NULL DEFAULT '',
        tagline     TEXT        NOT NULL DEFAULT '',
        description TEXT        NOT NULL DEFAULT '',
        stage       TEXT        NOT NULL DEFAULT '',
        image_url   TEXT        NOT NULL DEFAULT '',
        published   BOOLEAN     NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      sql`CREATE TABLE IF NOT EXISTS posts (
        id         SERIAL PRIMARY KEY,
        slug       TEXT        NOT NULL UNIQUE,
        title      TEXT        NOT NULL,
        excerpt    TEXT        NOT NULL DEFAULT '',
        body       TEXT        NOT NULL DEFAULT '',
        cover_url  TEXT        NOT NULL DEFAULT '',
        published  BOOLEAN     NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      sql`CREATE TABLE IF NOT EXISTS leads (
        id          SERIAL PRIMARY KEY,
        kind        TEXT        NOT NULL,
        name        TEXT        NOT NULL,
        phone       TEXT        NOT NULL,
        email       TEXT        NOT NULL DEFAULT '',
        type        TEXT        NOT NULL DEFAULT '',
        city        TEXT        NOT NULL DEFAULT '',
        message     TEXT        NOT NULL DEFAULT '',
        property_id INTEGER     REFERENCES properties(id) ON DELETE SET NULL,
        user_id     INTEGER     REFERENCES users(id) ON DELETE SET NULL,
        status      TEXT        NOT NULL DEFAULT 'new',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    ]);

    if (!exists) {
      await sql.transaction([...seedStatements(sql), ...projectStatements(sql)]);
      await sql.transaction(postStatements(sql));
    }
  })();
  ready.catch(() => { ready = null; });
  return ready;
}

module.exports = { getSql, ensureSchema, seedDemo };
