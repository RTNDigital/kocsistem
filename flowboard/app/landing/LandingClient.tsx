"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Lang = "tr" | "en";

const kaiMsgs: Record<Lang, { who: "bot" | "user"; text: string }[]> = {
  tr: [
    { who: "bot", text: "Merhaba! Ben KAI 👋  NoseJourney board'u yüklü. Ne öğrenmek istersin?" },
    { who: "user", text: "Bu sprint'te kim tıkalı?" },
    {
      who: "bot",
      text: 'Şu an 3 kart "In progress" kolonunda:\n• "Foto/Yorum Seçimleri" — Deniz, 3 gün\n• "Nailsin" — Tuğçe, 1 gün\n• "Before/after tek foto B/A alanı" — Maria, 4 gün ⚠︎',
    },
    { who: "user", text: "Maria'nın kartına benim adıma da watcher ekle." },
    { who: "bot", text: 'Ekledim ✓  "Before/after tek foto B/A alanı" kartının watcher listesine sen de eklendin. Başka?' },
  ],
  en: [
    { who: "bot", text: "Hi! I'm KAI 👋  NoseJourney board loaded. What do you want to know?" },
    { who: "user", text: "Who's stuck this sprint?" },
    {
      who: "bot",
      text: 'Right now 3 cards are in "In progress":\n• "Photo/Review tabs" — Deniz, 3d\n• "Nailsin" — Tuğçe, 1d\n• "Before/after single image area" — Maria, 4d ⚠︎',
    },
    { who: "user", text: "Add me as a watcher on Maria's card." },
    { who: "bot", text: 'Done ✓  You\'re now a watcher on "Before/after single image area". Anything else?' },
  ],
};

export default function LandingClient() {
  const [lang, setLang] = useState<Lang>("tr");
  const [activeStep, setActiveStep] = useState(1);
  const [kaiIdx, setKaiIdx] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const stepsRef = useRef<HTMLDivElement>(null);

  const t = (tr: string, en: string) => (lang === "tr" ? tr : en);

  // Scroll-to-top button visibility
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scrollytelling
  useEffect(() => {
    const steps = stepsRef.current?.querySelectorAll<HTMLDivElement>(".scrolly-step");
    if (!steps || !steps.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = (e.target as HTMLElement).dataset.step;
            if (idx) setActiveStep(Number(idx));
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    steps.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  // KAI chat loop
  useEffect(() => {
    const msgs = kaiMsgs[lang];
    const timer = setInterval(() => {
      setKaiIdx((i) => (i + 1) % (msgs.length + 2));
    }, 2600);
    return () => clearInterval(timer);
  }, [lang]);

  const currentMsgs = kaiMsgs[lang].slice(0, Math.min(kaiIdx + 1, kaiMsgs[lang].length));

  return (
    <div className="kocban-landing grain wobble">
      {/* NAV */}
      <nav className="nav">
        <div className="wrap nav-row">
          <a href="#" className="logo">
            <span className="logo-mark"><span>K</span></span>
            KocBan
          </a>
          <div className="nav-links">
            <a href="#ozellikler">{t("Özellikler", "Features")}</a>
            <a href="#nasil">{t("Nasıl çalışır", "How it works")}</a>
            <a href="#kai">KAI</a>
            <a href="#shots">{t("Ekranlar", "Screens")}</a>
            <a href="#sss">{t("SSS", "FAQ")}</a>
          </div>
          <div className="nav-right">
            <div className="lang-switch">
              <button className={lang === "tr" ? "on" : ""} onClick={() => setLang("tr")}>TR</button>
              <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
            </div>
            <Link href="/login" className="btn primary">
              {t("Ücretsiz başla", "Start free")}
              <span style={{ fontFamily: "var(--heading-font)", fontStyle: "italic" }}>→</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero">
        <div className="wrap">
          <div className="hero-top">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="dot"></span>
                {t("Mini yazılım ekipleri için", "Made for tiny software teams")}
              </div>
              {lang === "tr" ? (
                <h1>Küçük ekipler için<br /><span className="wiggle">büyük kanban.</span></h1>
              ) : (
                <h1>Big kanban for<br /><span className="wiggle">tiny teams.</span></h1>
              )}
              <p className="hero-lede">
                {t(
                  "Kanban, timeline, list view, leaderboard ve KAI AI asistanı — hepsi tek bir yerde, karmaşa yok. 2 ile 12 kişilik yazılım ekiplerinin birlikte nefes almasını sağlayan sıcak, sade bir tahta.",
                  "Kanban, timeline, list view, leaderboard and the KAI assistant — all in one warm, uncluttered board. Built for software teams between 2 and 12 people who want to breathe while they ship."
                )}
              </p>
              <div className="hero-actions">
                <Link href="/login" className="btn primary">
                  {t("Workspace oluştur", "Create a workspace")}
                  <span style={{ fontFamily: "var(--heading-font)", fontStyle: "italic" }}>→</span>
                </Link>
                <a href="#nasil" className="btn ghost">
                  {t("Nasıl çalıştığını gör", "See how it works")}
                </a>
              </div>
              <div className="hero-mini-note">
                <span className="avatars">
                  <span>DB</span><span>AL</span><span>YE</span><span>TK</span>
                </span>
                {t(
                  "120+ mini yazılım ekibi kullanıyor · Kredi kartı gerekmiyor",
                  "120+ tiny teams shipping with it · No credit card required"
                )}
              </div>
            </div>

            <div className="hero-stage" aria-hidden="true">
              <div className="hero-sticker">
                {lang === "tr" ? <>mini ekip,<br />büyük enerji</> : <>tiny team,<br />big energy</>}
              </div>

              <div className="stk stk1">
                <div className="bar"></div>
                <div>{t("Doktorun bildirimi", "Doctor notification")}</div>
                <div className="meta"><span className="av">YE</span> · APR 28</div>
              </div>
              <div className="stk stk2">
                <div className="bar v"></div>
                <div>{t("Foto/Yorum Seçimleri", "Photo & review tabs")}</div>
                <div className="meta"><span className="av" style={{ background: "var(--violet)" }}>DB</span> · APR 25</div>
              </div>
              <div className="stk stk3">
                <div className="bar m"></div>
                <div>{t("Before/After edit", "Before/After edit")}</div>
                <div className="meta">
                  <span className="av" style={{ background: "var(--mint)" }}>AL</span> · APR 28
                  <span className="pill" style={{ background: "color-mix(in srgb,var(--mint) 22%,transparent)", color: "#2f6b4a", marginLeft: "auto" }}>done</span>
                </div>
              </div>
              <div className="stk stk4">
                <div className="bar r"></div>
                <div>{t("Admin onay paneli", "Admin approval panel")}</div>
                <div className="meta">
                  <span className="av" style={{ background: "var(--rose)" }}>TK</span> · MAY 05
                  <span className="pill" style={{ background: "color-mix(in srgb,var(--rose) 22%,transparent)", color: "#a64343", marginLeft: "auto" }}>high</span>
                </div>
              </div>
              <div className="stk stk5">
                <div className="bar s"></div>
                <div>{t("Doktor profili Bio", "Doctor profile bio")}</div>
                <div className="meta"><span className="av" style={{ background: "var(--sky)" }}>DB</span> · APR 25</div>
              </div>
            </div>
          </div>

          <div className="marquee">
            <div className="marquee-row">
              <span>{t("PROJE TAHTALARI", "PROJECT BOARDS")}</span>
              <span>QuranAPP</span>
              <span className="star">✦</span>
              <span>NoseJourney</span>
              <span className="star">✦</span>
              <span>KocSistemFrontend</span>
              <span className="star">✦</span>
              <span>KocSistemBackend</span>
              <span className="star">✦</span>
              <span>Timeline 1</span>
              <span className="star">✦</span>
              <span>Timeline 2</span>
            </div>
          </div>
        </div>
      </header>

      {/* FEATURES */}
      <section className="sec" id="ozellikler">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-kicker">{t("Tek workspace, beş görünüm", "One workspace, five views")}</div>
            {lang === "tr" ? (
              <h2>Ekibin düşünme biçimiyle <em className="italic">aynı şey.</em></h2>
            ) : (
              <h2>Works the way your team <em className="italic">already thinks.</em></h2>
            )}
            <p className="lede">
              {t(
                "Kanban ile yakın planı, timeline ile uzak planı, list ile her şeyi tek ekranda gör. Leaderboard tatlı bir motivasyon, KAI ise sürekli yedeğinde duran AI çifti.",
                "Kanban for the near plan, timeline for the far plan, list for everything at once. Leaderboard for gentle momentum, KAI for an AI pair that has your back."
              )}
            </p>
          </div>

          <div className="feat-grid">
            <div className="feat big">
              <div className="chip"><span className="ic">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="3.5" height="10" rx="1" stroke="#2A1F14" strokeWidth="1.2"/><rect x="5.5" y="2" width="3.5" height="7" rx="1" stroke="#2A1F14" strokeWidth="1.2"/><rect x="10" y="2" width="3" height="5" rx="1" stroke="#2A1F14" strokeWidth="1.2"/></svg>
              </span>Kanban</div>
              <h3>{t("Sürükle, bırak, bitti.", "Drag, drop, done.")}</h3>
              <p>{t(
                "Backlog · To do · In progress · Planned · Done · Cancelled. Sütun başlıklarını değiştir, sprint bitince tek tıkla arşive gönder.",
                "Backlog · To do · In progress · Planned · Done · Cancelled. Rename columns on the fly and archive a finished sprint with one click."
              )}</p>
              <div className="mini-kanban" aria-hidden="true">
                <div className="col">
                  <div className="ct">Backlog</div>
                  <div className="c"><div className="tp"></div>Doktor bildirim akışı</div>
                  <div className="c"><div className="tp"></div>Mesaj şablonları</div>
                </div>
                <div className="col">
                  <div className="ct">To do</div>
                  <div className="c v"><div className="tp"></div>Before/after edit</div>
                  <div className="c v"><div className="tp"></div>Sıralama çubuğu</div>
                  <div className="c v"><div className="tp"></div>Bio güncelle</div>
                </div>
                <div className="col">
                  <div className="ct">In progress</div>
                  <div className="c m"><div className="tp"></div>Foto/Yorum seç.</div>
                  <div className="c m"><div className="tp"></div>B/A yükleme</div>
                </div>
                <div className="col">
                  <div className="ct">Done</div>
                  <div className="c r"><div className="tp"></div>Public link düzelt.</div>
                </div>
              </div>
            </div>

            <div className="feat sm">
              <div className="chip"><span className="ic">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="1" y1="4" x2="13" y2="4" stroke="#2A1F14" strokeWidth="1.2"/><line x1="1" y1="8" x2="13" y2="8" stroke="#2A1F14" strokeWidth="1.2"/><circle cx="5" cy="4" r="1.5" fill="#E8833A"/><circle cx="9" cy="8" r="1.5" fill="#6E5BE8"/></svg>
              </span>Timeline</div>
              <h3>{t("Aylara yayılan plan.", "A plan you can stretch.")}</h3>
              <p>{t(
                "Tüm projeleri üst üste görüntüle, bağımlılıkları çiz, bitişleri kaydır.",
                "All projects on one scrollable timeline — draw dependencies, nudge deadlines."
              )}</p>
              <div className="mini-timeline" aria-hidden="true">
                <div className="tl-row"><span className="lbl">QuranApp</span><span className="bar am" style={{ flex: 1 }}><span className="fl" style={{ width: "45%" }}></span></span></div>
                <div className="tl-row"><span className="lbl">NoseJourney</span><span className="bar" style={{ flex: 1 }}><span className="fl" style={{ width: "70%", left: "12%" }}></span></span></div>
                <div className="tl-row"><span className="lbl">KocSistem</span><span className="bar am" style={{ flex: 1 }}><span className="fl" style={{ width: "30%", left: "55%" }}></span></span></div>
                <div className="tl-row"><span className="lbl">Timeline 2</span><span className="bar" style={{ flex: 1 }}><span className="fl" style={{ width: "85%" }}></span></span></div>
              </div>
            </div>

            <div className="feat med">
              <div className="chip"><span className="ic">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="4" y1="3" x2="13" y2="3" stroke="#2A1F14" strokeWidth="1.2"/><line x1="4" y1="7" x2="13" y2="7" stroke="#2A1F14" strokeWidth="1.2"/><line x1="4" y1="11" x2="13" y2="11" stroke="#2A1F14" strokeWidth="1.2"/><circle cx="1.5" cy="3" r="1" fill="#2A1F14"/><circle cx="1.5" cy="7" r="1" fill="#2A1F14"/><circle cx="1.5" cy="11" r="1" fill="#2A1F14"/></svg>
              </span>List view</div>
              <h3>{t("Her şey tek bakışta.", "Everything at one glance.")}</h3>
              <p>{t(
                "Status ve priority'e göre grupla, assignee, due date ve label'a göre filtrele — sprint'teki yoğunluğu anında oku.",
                "Group by status and priority, filter by assignee, due date and label — read the pulse of a sprint instantly."
              )}</p>
            </div>

            <div className="feat third">
              <div className="chip"><span className="ic">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 12h8M4 12V6M7 12V3M10 12V8" stroke="#2A1F14" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </span>Leaderboard</div>
              <h3>{t("Tatlı rekabet.", "Gentle competition.")}</h3>
              <p>{t(
                "Story point totalleri, kim ne kadar aktif, kim bitirdi — baskı değil ritim.",
                "Story points, who's active, who shipped — not pressure, just rhythm."
              )}</p>
              <div className="mini-leader">
                <div className="row top"><span className="ra">1</span><span className="av">DB</span><span className="nm">Deniz B.</span><span className="pt">10 PTS</span></div>
                <div className="row"><span className="ra">2</span><span className="av" style={{ background: "var(--violet)" }}>AL</span><span className="nm">Ada L.</span><span className="pt">8 PTS</span></div>
                <div className="row"><span className="ra">3</span><span className="av" style={{ background: "var(--mint)" }}>YE</span><span className="nm">Yahya E.</span><span className="pt">8 PTS</span></div>
              </div>
            </div>

            <div className="feat third">
              <div className="chip"><span className="ic">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="3" rx="1" stroke="#2A1F14" strokeWidth="1.2"/><rect x="2.5" y="5.5" width="9" height="6" rx="1" stroke="#2A1F14" strokeWidth="1.2"/><line x1="5.5" y1="8" x2="8.5" y2="8" stroke="#2A1F14" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </span>{t("Sprint Arşivi", "Sprint Archive")}</div>
              <h3>{t("Geçmiş her zaman elinde.", "The past, always nearby.")}</h3>
              <p>{t(
                "Complete Sprint'e bastığında v1, v2, v3... her şey arşivde, tam hikayesiyle korunur.",
                "Hit Complete Sprint and v1, v2, v3… everything stays in the archive with its full story."
              )}</p>
            </div>

            <div className="feat third">
              <div className="chip"><span className="ic">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="#6E5BE8" strokeWidth="1.2"/><circle cx="5.5" cy="6" r=".8" fill="#6E5BE8"/><circle cx="8.5" cy="6" r=".8" fill="#6E5BE8"/><path d="M5 9c.6.6 3.4.6 4 0" stroke="#6E5BE8" strokeWidth="1.2" strokeLinecap="round" fill="none"/></svg>
              </span>KAI Assistant</div>
              <h3>{t("Yanında duran AI.", "An AI that stays close.")}</h3>
              <p>{t(
                "Tahta hakkında sor, görev oluştur, özet al. Tek bir sohbet kutusundan.",
                "Ask about your board, create tasks, get summaries. One little chat."
              )}</p>
            </div>
          </div>
        </div>
      </section>

      {/* SCROLLY */}
      <section className="sec bg-tint" id="nasil">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-kicker">{t("5 dakikada kurul", "Set up in 5 min")}</div>
            {lang === "tr" ? (
              <h2>İlk sprint, <em className="italic">scroll süresinden</em> önce.</h2>
            ) : (
              <h2>Your first sprint, <em className="italic">before you finish scrolling.</em></h2>
            )}
          </div>

          <div className="scrolly">
            <div className="scrolly-inner">
              <div className="scrolly-steps" ref={stepsRef}>
                {[
                  {
                    n: 1,
                    tr: { h: "Bir team board oluştur.", p: "Workspace'ine gir ve + Team board'a bas. QuranAPP, NoseJourney, KocSistem… her proje kendi tahtası." },
                    en: { h: "Create a team board.", p: "Open your workspace and hit + Team board. Every project — QuranAPP, NoseJourney, KocSistem — lives on its own board." },
                  },
                  {
                    n: 2,
                    tr: { h: "Kart yaz, sürükle, ilerlet.", p: "Her kartta assignee, due date, priority, label ve checklist. Sütunlar arasında sürükleyerek akışı değiştir." },
                    en: { h: "Write cards, drag, keep moving.", p: "Each card has assignee, due date, priority, labels and checklist. Drag across columns to change the flow." },
                  },
                  {
                    n: 3,
                    tr: { h: "Timeline'da uzak planı gör.", p: "Tüm projeleri üst üste görüntüle. Bağımlılıkları çiz, çakışan haftaları fark et, son teslimleri kaydır." },
                    en: { h: "Zoom out on the timeline.", p: "See every project stacked. Draw dependencies, spot overlapping weeks, drag deadlines." },
                  },
                  {
                    n: 4,
                    tr: { h: "KAI'ye sor, özet al.", p: "Sağ alttaki sohbetten \"bu sprint'te kim tıkanmış?\" de. KAI board'u okuyup anlaşılır bir cevap verir." },
                    en: { h: "Ask KAI for a summary.", p: "In the bottom-right chat, ask \"who's stuck this sprint?\" KAI reads the board and answers clearly." },
                  },
                  {
                    n: 5,
                    tr: { h: "Sprint'i bitir, leaderboard'a bak.", p: "Complete Sprint'e bas → v5 arşive düşer. Story point'ler leaderboard'da, herkes kendi hızını görür." },
                    en: { h: "Wrap the sprint, peek at the leaderboard.", p: "Hit Complete Sprint → v5 lands in the archive. Story points show on the leaderboard; everyone sees their pace." },
                  },
                ].map((s) => (
                  <div key={s.n} className={`scrolly-step ${activeStep === s.n ? "active" : ""}`} data-step={s.n}>
                    <div className="num">{s.n}</div>
                    <h3>{lang === "tr" ? s.tr.h : s.en.h}</h3>
                    <p>{lang === "tr" ? s.tr.p : s.en.p}</p>
                  </div>
                ))}
              </div>

              <div className="scrolly-sticky" aria-hidden="true">
                {[
                  { n: 1, src: "/landing/boards.png", alt: "Boards" },
                  { n: 2, src: "/landing/kanban.png", alt: "Kanban" },
                  { n: 3, src: "/landing/timeline.png", alt: "Timeline" },
                  { n: 4, src: "/landing/kai.png", alt: "KAI" },
                  { n: 5, src: "/landing/leaderboard.png", alt: "Leaderboard" },
                ].map((img) => (
                  <div key={img.n} className={`scrolly-img ${activeStep === img.n ? "active" : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.src} alt={img.alt} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KAI */}
      <section className="sec bg-tint" id="kai">
        <div className="wrap">
          <div className="kai-shell">
            <div className="kai-chat">
              <div className="kai-chat-head">
                <div className="av">K</div>
                <div className="meta">
                  <div className="nm">
                    KAI <span style={{ fontFamily: "var(--mono-font)", fontSize: 11, color: "var(--ink-3)", fontWeight: 400, marginLeft: 6 }}>FlowBoard Assistant</span>
                  </div>
                  <div className="sub">
                    {t("● çevrimiçi · board context yüklendi", "● online · board context loaded")}
                  </div>
                </div>
              </div>
              <div className="kai-chat-body">
                {currentMsgs.map((m, i) => (
                  <div key={i} className={`kai-msg ${m.who}`}>{m.text}</div>
                ))}
              </div>
              <div className="kai-chat-input">
                <input placeholder={t("KAI'ye bir şey sor…", "Ask KAI something…")} readOnly />
                <button aria-label="Send">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>

            <div className="kai-copy">
              <div className="sec-kicker">KAI — {t("yerleşik AI asistan", "built-in AI pair")}</div>
              {lang === "tr" ? (
                <h2>Board'unu <span className="wiggle">okuyan</span> bir AI.</h2>
              ) : (
                <h2>An AI that <span className="wiggle">reads</span> your board.</h2>
              )}
              <p className="lede">
                {t(
                  "KAI, workspace'indeki kartları, assignee'leri, priority'leri ve sprint context'ini bilir. Başka tab açmadan sormak istediğini sor.",
                  "KAI knows the cards, assignees, priorities and sprint context in your workspace. Ask it anything without opening another tab."
                )}
              </p>

              <div className="kai-bullets">
                <div className="kai-bullet">
                  <div className="ic">?</div>
                  <div>
                    <h4>{t("\"Bu sprint'te kim tıkalı?\"", "\"Who's blocked this sprint?\"")}</h4>
                    <p>{t(
                      "In progress'te bekleyen, geç kalmış kartları isim isim listeler.",
                      "Lists the stuck, overdue cards card by card — with names."
                    )}</p>
                  </div>
                </div>
                <div className="kai-bullet">
                  <div className="ic">+</div>
                  <div>
                    <h4>{t("\"Bildirim tasarımı için 3 subtask aç.\"", "\"Open 3 subtasks for the notification design.\"")}</h4>
                    <p>{t(
                      "Doğru board'da, doğru kolonda, assignee bile önerilmiş şekilde oluşturur.",
                      "Creates them on the right board, right column, with suggested assignees."
                    )}</p>
                  </div>
                </div>
                <div className="kai-bullet">
                  <div className="ic">∑</div>
                  <div>
                    <h4>{t("\"v5'in özetini bana yaz.\"", "\"Summarize v5 for me.\"")}</h4>
                    <p>{t(
                      "Sprint arşivinden çeker: tamamlanan, iptal, story point dağılımı, öne çıkan notlar.",
                      "Pulls from the sprint archive: completed, cancelled, story point split, notable notes."
                    )}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SHOTS */}
      <section className="sec" id="shots">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-kicker">{t("Gerçek ekranlar", "Real screens")}</div>
            {lang === "tr" ? (
              <h2>Rendered değil. <em className="italic">Kullanılıyor.</em></h2>
            ) : (
              <h2>Not rendered. <em className="italic">Being used.</em></h2>
            )}
          </div>

          <div className="shots">
            {/* eslint-disable @next/next/no-img-element */}
            <div className="shot a"><img src="/landing/kanban.png" alt="Kanban" /><div className="cap">Kanban · NoseJourney</div></div>
            <div className="shot b"><img src="/landing/leaderboard.png" alt="Leaderboard" /><div className="cap">Leaderboard</div></div>
            <div className="shot c"><img src="/landing/kai.png" alt="KAI" /><div className="cap">KAI chat</div></div>
            <div className="shot d"><img src="/landing/timeline.png" alt="Timeline" /><div className="cap">Timeline · Apr 2026</div></div>
            <div className="shot b"><img src="/landing/list-view.png" alt="List" /><div className="cap">List view</div></div>
            <div className="shot a"><img src="/landing/sprint-archive.png" alt="Sprint Archive" /><div className="cap">Sprint archive · v5</div></div>
            {/* eslint-enable @next/next/no-img-element */}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="sec bg-tint" id="sss">
        <div className="wrap">
          <div className="sec-head" style={{ textAlign: "center", marginLeft: "auto", marginRight: "auto" }}>
            <div className="sec-kicker" style={{ justifyContent: "center" }}>
              {t("Sık sorulanlar", "Frequently asked")}
            </div>
            {lang === "tr" ? (
              <h2>Merak <em className="italic">ettiklerin.</em></h2>
            ) : (
              <h2>Things you're <em className="italic">wondering.</em></h2>
            )}
          </div>

          <div className="faq">
            {[
              {
                tr: { q: "Kaç kişilik ekipler için uygun?", a: "KocBan, 2–12 kişilik yazılım ekipleri için tasarlandı. Mini startup'lar, freelance takımlar, bitirme projesi ekipleri, 3 frontend + 2 backend'den oluşan indie ürün ekipleri için ideal. 30+ kişilik büyük organizasyonlara hitap etmiyoruz — o iş için ağır kurumsal araçlar zaten var." },
                en: { q: "What team size is this for?", a: "KocBan is designed for software teams of 2–12. Mini startups, freelance squads, senior project teams, indie product teams with 3 frontend + 2 backend. We're not chasing 30+ orgs — there are heavy enterprise tools for that already." },
                open: true,
              },
              {
                tr: { q: "Trello veya Linear'dan farkı ne?", a: "Trello'nun sıcaklığı + Linear'ın hızı, ama boyut olarak mini. Kanban + timeline + list + leaderboard + KAI AI aynı workspace'te — sekmeler değiştirmeden ekibinin nasıl gittiğini bir bakışta görürsün." },
                en: { q: "How is it different from Trello or Linear?", a: "The warmth of Trello + the speed of Linear, but tiny. Kanban + timeline + list + leaderboard + KAI AI all in one workspace — no tab-hopping to feel your team's pulse." },
              },
              {
                tr: { q: "KAI gerçekten faydalı mı, yoksa süs mü?", a: "KAI, board context'ine sahip. Kartları, assignee'leri, sprint state'ini bilir. \"Gecikenleri listele\", \"bu sprint'in ortalama story point'i\", \"Nazlı'nın yaptığı işleri özetle\" gibi sorulara anlamlı cevap verir. Üretken görevler de açabilir." },
                en: { q: "Is KAI actually useful or just a gimmick?", a: "KAI has board context. It knows cards, assignees, sprint state. Ask \"list overdue items\", \"average story points this sprint\", \"summarize Nazlı's work\" and it answers meaningfully. It can also create tasks." },
              },
              {
                tr: { q: "Ücretli mi?", a: "Şu an erken kullanıcılara ücretsiz. Stabilleştikçe mini ekipler için uygun fiyatlı ve anlaşılır bir plan yayınlayacağız. Ücretsiz planın her zaman kalacak." },
                en: { q: "Does it cost anything?", a: "Free for early users right now. As we stabilize we'll publish a simple, fair plan for tiny teams. The free tier will always stay." },
              },
              {
                tr: { q: "Verilerim güvende mi?", a: "Postgres üzerinde şifreli, R2 üzerinde private attachments. Workspace bazlı izolasyon, auth için proven NextAuth. Export her an elinde." },
                en: { q: "Is my data safe?", a: "Encrypted Postgres storage, private R2 attachments, workspace-level isolation, proven NextAuth. Export available any time." },
              },
              {
                tr: { q: "Mobil kullanım?", a: "Web responsive — telefondan card'ları gezip notlara bakabilirsin. Native app şu an roadmap'te değil; ağırlık mini yazılım ekipleri için masaüstü deneyiminde." },
                en: { q: "Mobile?", a: "Responsive web — you can browse cards and read notes from your phone. Native apps aren't on the roadmap; the focus is a great desktop experience for tiny dev teams." },
              },
            ].map((item, i) => (
              <details key={i} className="qa" open={item.open}>
                <summary>{lang === "tr" ? item.tr.q : item.en.q}</summary>
                <div className="ans">{lang === "tr" ? item.tr.a : item.en.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="wrap" id="cta">
        <div className="cta-band">
          {lang === "tr" ? (
            <h2>Mini bir ekipseniz, <span className="wiggle">büyük bir tahta</span><br />hak ediyorsunuz.</h2>
          ) : (
            <h2>If you're a tiny team, you deserve a<br /><span className="wiggle">board that isn't.</span></h2>
          )}
          <p>
            {t(
              "Workspace'ini kur, ilk tahtanı aç, KAI'yi arkadaş edin. 3 dakika sürer.",
              "Spin up a workspace, open your first board, say hi to KAI. Takes 3 minutes."
            )}
          </p>
          <div className="hero-actions">
            <Link href="/login" className="btn amber">
              {t("Workspace oluştur", "Create your workspace")}
              <span style={{ fontFamily: "var(--heading-font)", fontStyle: "italic" }}>→</span>
            </Link>
            <a href="#nasil" className="btn ghost">{t("Nasıl çalışır", "How it works")}</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot-row">
            <div className="foot-col foot-brand">
              <div className="logo"><span className="logo-mark"><span>K</span></span> KocBan</div>
              <p>{t(
                "Mini yazılım ekipleri için sıcak, sade bir proje yönetimi tahtası. Deniz Büyükşahin tarafından yapılıyor.",
                "A warm, uncluttered project board for tiny software teams. Crafted by Deniz Büyükşahin."
              )}</p>
            </div>
            <div className="foot-col">
              <h5>{t("Ürün", "Product")}</h5>
              <ul>
                <li><a href="#ozellikler">Kanban</a></li>
                <li><a href="#ozellikler">Timeline</a></li>
                <li><a href="#ozellikler">List view</a></li>
                <li><a href="#ozellikler">Leaderboard</a></li>
                <li><a href="#kai">KAI AI</a></li>
              </ul>
            </div>
            <div className="foot-col">
              <h5>{t("Şirket", "Company")}</h5>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Changelog</a></li>
                <li><a href="#">Roadmap</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>
            <div className="foot-col">
              <h5>{t("Yasal", "Legal")}</h5>
              <ul>
                <li><a href="#">Privacy</a></li>
                <li><a href="#">Terms</a></li>
                <li><a href="#">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 KocBan · Built with care in Istanbul</span>
            <span>v0.9 · mini but mighty ✦</span>
          </div>
        </div>
      </footer>
      {/* Scroll to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Sayfanın başına git"
        style={{
          position: "fixed",
          bottom: 32,
          right: 32,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "var(--ink)",
          color: "var(--paper)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "3px 3px 0 var(--accent)",
          zIndex: 200,
          opacity: showTop ? 1 : 0,
          transform: showTop ? "translateY(0)" : "translateY(12px)",
          transition: "opacity .25s, transform .25s",
          pointerEvents: showTop ? "auto" : "none",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 13V3M3 8l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
