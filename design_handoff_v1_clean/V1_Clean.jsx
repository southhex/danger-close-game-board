// V1 — "Clean & Default" — Modern SaaS shell. Emerald accent. Grounded.
// Sidebar with labels, top bar with breadcrumb, mission state as a proper
// page with sections. Density: comfortable.

const V1_ACCENT = ACCENTS.emerald;

const V1Desktop = () => {
  const r = (v) => `calc(${v} * var(--r, 1))`;
  const pad = (v) => `calc(${v} * var(--d, 1))`;
  return (
    <div style={{
      width: 1280, height: 820, display: 'flex',
      background: TOKENS.bg, color: TOKENS.ink,
      fontFamily: 'var(--ui-font, "Inter"), system-ui, sans-serif',
      fontSize: 14, overflow: 'hidden',
    }}>
      {/* SIDEBAR */}
      <aside style={{
        width: 220, background: TOKENS.surface,
        borderRight: `1px solid ${TOKENS.borderSoft}`,
        display: 'flex', flexDirection: 'column',
        padding: `20px 14px`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px 18px' }}>
          <div style={{
            width: 28, height: 28, borderRadius: r('7px'),
            background: V1_ACCENT, color: TOKENS.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, letterSpacing: -0.3,
          }}>DC</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Danger Close</div>
            <div style={{ fontSize: 11, color: TOKENS.muted }}>Play aid</div>
          </div>
        </div>

        {[
          { icon: 'barracks', label: 'Barracks', count: 6 },
          { icon: 'mission', label: 'Mission', active: true, badge: 'LIVE' },
          { icon: 'dice', label: 'Dice Tray' },
          { icon: 'settings', label: 'Settings' },
        ].map((n, i) => (
          <button key={i} style={{
            all: 'unset', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: `9px 10px`, borderRadius: r('8px'), marginBottom: 2,
            background: n.active ? `color-mix(in oklch, ${V1_ACCENT} 14%, transparent)` : 'transparent',
            color: n.active ? V1_ACCENT : TOKENS.inkDim,
            fontWeight: n.active ? 600 : 500, fontSize: 13.5,
          }}>
            <Icon name={n.icon} size={17} />
            <span style={{ flex: 1 }}>{n.label}</span>
            {n.badge && (
              <span style={{
                fontSize: 9.5, letterSpacing: 0.6, fontWeight: 700,
                padding: '2px 6px', borderRadius: r('4px'),
                background: V1_ACCENT, color: TOKENS.bg,
              }}>{n.badge}</span>
            )}
            {n.count != null && (
              <span style={{ fontSize: 11, color: TOKENS.subtle }}>{n.count}</span>
            )}
          </button>
        ))}

        <div style={{ marginTop: 'auto', padding: 10, borderRadius: r('10px'),
          background: TOKENS.surface2, border: `1px solid ${TOKENS.borderSoft}` }}>
          <div style={{ fontSize: 11, color: TOKENS.muted, marginBottom: 4 }}>Campaign</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Op. Coldwater</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2,
                background: i < 2 ? V1_ACCENT : TOKENS.border }} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: TOKENS.subtle, marginTop: 6 }}>Sector 2 of 5</div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          height: 56, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16,
          borderBottom: `1px solid ${TOKENS.borderSoft}`, background: TOKENS.bg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: TOKENS.muted }}>Mission</span>
            <Icon name="chevron" size={14} style={{ color: TOKENS.subtle, transform: 'rotate(-90deg)' }} />
            <span style={{ fontWeight: 600 }}>Ridge 404</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
            borderRadius: r('6px'), background: TOKENS.surface,
            border: `1px solid ${TOKENS.borderSoft}`, fontSize: 12, color: TOKENS.muted,
          }}>
            <Icon name="search" size={13} />
            <span>Search gear, perks…</span>
            <span style={{ marginLeft: 14, padding: '1px 5px', borderRadius: 3,
              background: TOKENS.surface2, color: TOKENS.subtle, fontSize: 10.5 }}>⌘K</span>
          </div>
          <button style={{
            all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: r('6px'), border: `1px solid ${TOKENS.border}`,
            fontSize: 12.5, color: TOKENS.inkDim,
          }}>
            <Icon name="dice" size={14} /> Roll dice
          </button>
          <button style={{
            all: 'unset', cursor: 'pointer',
            padding: '7px 14px', borderRadius: r('6px'),
            background: V1_ACCENT, color: TOKENS.bg, fontWeight: 600, fontSize: 12.5,
          }}>Advance</button>
        </div>

        {/* Page */}
        <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
          {/* Hero */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 11.5, color: V1_ACCENT, fontWeight: 600, letterSpacing: 0.4, marginBottom: 6 }}>
                ACTIVE MISSION · ADVANCE 4
              </div>
              <h1 style={{ all: 'unset', display: 'block', fontSize: 26, fontWeight: 700, letterSpacing: -0.6 }}>
                Op. Coldwater
              </h1>
              <div style={{ fontSize: 13, color: TOKENS.muted, marginTop: 4 }}>
                Ridge 404 · Threat Heavy · Bad weather
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{
                padding: '10px 16px', borderRadius: r('10px'),
                background: TOKENS.surface, border: `1px solid ${TOKENS.borderSoft}`, textAlign: 'center',
              }}>
                <div style={{ fontSize: 10.5, color: TOKENS.muted, letterSpacing: 0.4, fontWeight: 600 }}>MOMENTUM</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2,
                  fontFamily: '"JetBrains Mono", monospace',
                  color: TOKENS.wounded }}>−1</div>
                <div style={{ fontSize: 10.5, color: TOKENS.muted }}>Losing ground</div>
              </div>
              <div style={{
                padding: '10px 16px', borderRadius: r('10px'),
                background: TOKENS.surface, border: `1px solid ${TOKENS.borderSoft}`, textAlign: 'center',
              }}>
                <div style={{ fontSize: 10.5, color: TOKENS.muted, letterSpacing: 0.4, fontWeight: 600 }}>SQUAD</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2,
                  fontFamily: '"JetBrains Mono", monospace' }}>4<span style={{ color: TOKENS.muted, fontSize: 14 }}>/4</span></div>
                <div style={{ fontSize: 10.5, color: TOKENS.muted }}>1 wounded</div>
              </div>
            </div>
          </div>

          {/* Sector card */}
          <section style={{
            background: TOKENS.surface, border: `1px solid ${TOKENS.borderSoft}`,
            borderRadius: r('14px'), padding: 20, marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Sector conditions</div>
              <div style={{ fontSize: 11.5, color: TOKENS.muted }}>Cover 1 · max 2 Fortified · max 2 Flanking</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Cover', v: 'Normal', n: '1' },
                { label: 'Space', v: 'Transitional', n: '1' },
                { label: 'Threat', v: 'Heavy', n: '3' },
                { label: 'Weather', v: 'Bad', n: '−1' },
              ].map(f => (
                <div key={f.label} style={{
                  padding: 14, borderRadius: r('10px'),
                  background: TOKENS.surface2, border: `1px solid ${TOKENS.borderSoft}`,
                }}>
                  <div style={{ fontSize: 11, color: TOKENS.muted, fontWeight: 600, letterSpacing: 0.3 }}>{f.label.toUpperCase()}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{f.v}</div>
                    <div style={{ fontSize: 13, color: TOKENS.muted, fontFamily: '"JetBrains Mono", monospace' }}>{f.n}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Squad */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Squad</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: TOKENS.muted, padding: '4px 8px' }}>Grid</button>
              <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: V1_ACCENT, padding: '4px 8px', fontWeight: 600 }}>Cards</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {mockSquad.map(t => <V1TrooperCard key={t.id} t={t} />)}
          </div>
        </div>
      </main>
    </div>
  );
};

const V1TrooperCard = ({ t }) => {
  const col = statusColor(t.status);
  const dim = t.status === 'dead' ? 0.4 : 1;
  return (
    <div style={{
      opacity: dim,
      background: TOKENS.surface, border: `1px solid ${TOKENS.borderSoft}`,
      borderRadius: 'calc(12px * var(--r, 1))', overflow: 'hidden',
    }}>
      <div style={{ height: 3, background: col }} />
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
            <div style={{ fontSize: 11, color: TOKENS.muted }}>{t.callsign} · {t.tag}</div>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
            padding: '3px 7px', borderRadius: 999,
            background: `color-mix(in oklch, ${col} 18%, transparent)`,
            color: col, whiteSpace: 'nowrap',
          }}>{statusLabel(t.status).toUpperCase()}</span>
        </div>

        {/* pip rows */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
          <PipRow label="GRIT" v={t.grit} max={t.grit_max} color={ACCENTS.emerald} />
          <PipRow label="AMMO" v={t.ammo} max={t.ammo_max} color={TOKENS.grazed} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
          <Chip label="OFF" value={t.offpos.toUpperCase()} />
          <Chip label="DEF" value={t.defpos === 'incover' ? 'IN COVER' : t.defpos.toUpperCase()} />
        </div>

        <div style={{ fontSize: 11.5, color: TOKENS.inkDim, lineHeight: 1.55 }}>
          <div style={{ color: TOKENS.muted, fontSize: 10.5, fontWeight: 600, letterSpacing: 0.3, marginBottom: 3 }}>LOADOUT</div>
          <div>{t.weapon}</div>
          <div style={{ color: TOKENS.muted }}>{t.special_weapon} · {t.special_gear}</div>
        </div>

        <div style={{
          marginTop: 10, paddingTop: 10, borderTop: `1px solid ${TOKENS.borderSoft}`,
          display: 'flex', justifyContent: 'space-between', fontSize: 11,
          fontFamily: '"JetBrains Mono", monospace',
        }}>
          <span style={{ color: t.eff_mob < t.mobility ? TOKENS.wounded : TOKENS.inkDim }}>
            MOB {t.eff_mob}{t.eff_mob < t.mobility && <span style={{ color: TOKENS.muted }}>/{t.mobility}</span>}
          </span>
          <span style={{ color: ACCENTS.emerald }}>FLK +{t.eff_mob >= 5 ? 3 : t.eff_mob === 4 ? 2 : 1}</span>
        </div>
      </div>
    </div>
  );
};

const PipRow = ({ label, v, max, color }) => (
  <div style={{ flex: 1 }}>
    <div style={{ fontSize: 10, color: TOKENS.muted, fontWeight: 600, letterSpacing: 0.3, marginBottom: 4 }}>{label}</div>
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 6, borderRadius: 'calc(3px * var(--r, 1))',
          background: i < v ? color : TOKENS.border,
        }} />
      ))}
    </div>
  </div>
);

const Chip = ({ label, value }) => (
  <div style={{
    padding: '6px 8px', borderRadius: 'calc(6px * var(--r, 1))',
    background: TOKENS.surface2, border: `1px solid ${TOKENS.borderSoft}`,
  }}>
    <div style={{ fontSize: 9.5, color: TOKENS.muted, fontWeight: 600, letterSpacing: 0.3 }}>{label}</div>
    <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 1 }}>{value}</div>
  </div>
);

// MOBILE V1
const V1Mobile = () => (
  <div style={{
    width: 390, height: 820,
    background: TOKENS.bg, color: TOKENS.ink,
    fontFamily: 'var(--ui-font, "Inter"), system-ui, sans-serif',
    fontSize: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden',
  }}>
    {/* top */}
    <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${TOKENS.borderSoft}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: V1_ACCENT, fontWeight: 600, letterSpacing: 0.4 }}>ACTIVE · ADV 4</div>
        <button style={{ all: 'unset', cursor: 'pointer',
          width: 36, height: 36, borderRadius: 10, background: V1_ACCENT,
          color: TOKENS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="dice" size={18} />
        </button>
      </div>
      <h1 style={{ all: 'unset', display: 'block', fontSize: 22, fontWeight: 700, marginTop: 4, letterSpacing: -0.4 }}>Op. Coldwater</h1>
      <div style={{ fontSize: 12.5, color: TOKENS.muted, marginTop: 2 }}>Ridge 404 · Heavy · Bad weather</div>
    </div>

    {/* momentum strip */}
    <div style={{ padding: 14, display: 'flex', gap: 10 }}>
      <div style={{ flex: 2, background: TOKENS.surface, borderRadius: 12, padding: 12, border: `1px solid ${TOKENS.borderSoft}` }}>
        <div style={{ fontSize: 10.5, color: TOKENS.muted, fontWeight: 600, letterSpacing: 0.3 }}>MOMENTUM</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <button style={{ all: 'unset', cursor: 'pointer', width: 28, height: 28, borderRadius: 8,
            background: TOKENS.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="minus" size={14} />
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: TOKENS.wounded, fontFamily: '"JetBrains Mono", monospace' }}>−1</div>
            <div style={{ fontSize: 10, color: TOKENS.muted }}>Losing ground</div>
          </div>
          <button style={{ all: 'unset', cursor: 'pointer', width: 28, height: 28, borderRadius: 8,
            background: TOKENS.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={14} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, background: TOKENS.surface, borderRadius: 12, padding: 12, border: `1px solid ${TOKENS.borderSoft}`, textAlign: 'center' }}>
        <div style={{ fontSize: 10.5, color: TOKENS.muted, fontWeight: 600, letterSpacing: 0.3 }}>SQUAD</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, fontFamily: '"JetBrains Mono", monospace' }}>4/4</div>
      </div>
    </div>

    {/* tab label */}
    <div style={{ padding: '4px 18px 8px', fontSize: 13, fontWeight: 600 }}>Squad</div>

    {/* squad cards scrolling */}
    <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {mockSquad.map(t => (
        <div key={t.id} style={{
          background: TOKENS.surface, border: `1px solid ${TOKENS.borderSoft}`,
          borderRadius: 12, padding: 12, display: 'flex', gap: 12, alignItems: 'center',
          opacity: t.status === 'dead' ? 0.4 : 1,
        }}>
          <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: statusColor(t.status) }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: 11, color: TOKENS.muted }}>{t.callsign}</div>
            </div>
            <div style={{ fontSize: 11, color: statusColor(t.status), fontWeight: 600, marginTop: 1 }}>
              {statusLabel(t.status)} · {t.offpos} / {t.defpos === 'incover' ? 'in cover' : t.defpos}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <PipRow label="GRIT" v={t.grit} max={t.grit_max} color={V1_ACCENT} />
              <PipRow label="AMMO" v={t.ammo} max={t.ammo_max} color={TOKENS.grazed} />
            </div>
          </div>
          <Icon name="chevron" size={16} style={{ color: TOKENS.subtle, transform: 'rotate(-90deg)' }} />
        </div>
      ))}
    </div>

    {/* bottom nav */}
    <div style={{
      display: 'flex', borderTop: `1px solid ${TOKENS.borderSoft}`,
      background: TOKENS.surface, padding: '6px 4px 10px',
    }}>
      {[
        { icon: 'barracks', label: 'Barracks' },
        { icon: 'mission', label: 'Mission', active: true },
        { icon: 'dice', label: 'Dice' },
        { icon: 'settings', label: 'Settings' },
      ].map((n, i) => (
        <div key={i} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          padding: '8px 0', color: n.active ? V1_ACCENT : TOKENS.muted,
          fontSize: 10.5, fontWeight: n.active ? 600 : 500,
        }}>
          <Icon name={n.icon} size={20} />
          {n.label}
        </div>
      ))}
    </div>
  </div>
);

Object.assign(window, { V1Desktop, V1Mobile, V1TrooperCard, PipRow, Chip });
