"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { I, Logo } from "@/components/Icons";
import { loginAction, signupAction, type AuthState } from "./actions";

interface Props {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: Props) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, { error: null });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1.05fr",
        background: "var(--bg)",
      }}
      className="auth-grid"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "40px 56px",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo />
        </div>

        <div style={{ maxWidth: 360, width: "100%", margin: "0 auto" }}>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "-.02em",
              margin: "0 0 6px",
              lineHeight: 1.1,
            }}
          >
            {mode === "login" ? "Welcome back." : "Start moving work."}
          </h1>
          <p style={{ color: "var(--ink-3)", margin: "0 0 28px", fontSize: 14 }}>
            {mode === "login"
              ? "Sign in to your boards."
              : "Create an account — takes 5 seconds."}
          </p>

          <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "signup" && (
              <Field label="Full name">
                <Input
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ada Lovelace"
                />
              </Field>
            )}
            <Field label="Email">
              <Input
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@work.com"
                autoComplete="email"
              />
            </Field>
            <Field label="Password">
              <div style={{ position: "relative" }}>
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  style={{ paddingRight: 36 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "var(--ink-3)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 4,
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? I.eyeOff : I.eye}
                </button>
              </div>
            </Field>

            {state.error && (
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--err)",
                  background: "color-mix(in oklab, var(--err) 10%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--err) 25%, transparent)",
                  borderRadius: 7,
                  padding: "8px 10px",
                }}
              >
                {state.error}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              type="submit"
              disabled={pending}
              style={{ justifyContent: "center", marginTop: 4 }}
            >
              {pending ? "…" : mode === "login" ? "Sign in" : "Create account"}
              <span style={{ opacity: 0.7 }}>{I.chevR}</span>
            </Button>
          </form>

          <p
            style={{
              textAlign: "center",
              marginTop: 22,
              color: "var(--ink-3)",
              fontSize: 13,
            }}
          >
            {mode === "login" ? "Don't have an account?" : "Already have one?"}{" "}
            <Link
              href={mode === "login" ? "/signup" : "/login"}
              style={{ color: "var(--accent)", fontWeight: 500, textDecoration: "none" }}
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </Link>
          </p>
        </div>

        <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: "var(--ink-4)" }}>
          <span className="mono">v0.1.0</span>
          <span>·</span>
          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </div>

      <div
        className="auth-aside"
        style={{
          background:
            "linear-gradient(155deg, color-mix(in oklab, var(--accent) 14%, var(--bg)), var(--bg) 60%)",
          borderLeft: "1px solid var(--line)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--ink) 10%, transparent) 1px, transparent 0)",
            backgroundSize: "22px 22px",
            opacity: 0.4,
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          } as React.CSSProperties}
        />
        <div style={{ position: "relative", width: "100%", maxWidth: 560 }}>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              marginBottom: 14,
              letterSpacing: ".08em",
            }}
          >
            KOCSISTEMBOARD / PRODUCT
          </div>
          <MiniBoardPreview />
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-aside { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function MiniBoardPreview() {
  const cols = [
    {
      title: "To do",
      cards: [
        { t: "Password reset bounces", labels: ["bug"] },
        { t: "Invite flow copy", labels: ["feature"] },
      ],
    },
    {
      title: "In progress",
      cards: [
        { t: "Kanban drag perf", labels: ["feature"], progress: 0.66 },
        { t: "Activity feed sidebar", labels: ["feature"] },
      ],
    },
    {
      title: "Review",
      cards: [{ t: "Board background picker", labels: ["design"] }],
    },
  ];
  const colorFor = (l: string) =>
    ({ bug: "#E25C4B", feature: "#3E7CE0", design: "#8B5BD9" })[l] ?? "#888";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: 14,
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {cols.map((c, ci) => (
        <div key={ci} style={{ background: "var(--surface-2)", borderRadius: 10, padding: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--ink-2)",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            <span>{c.title}</span>
            <span className="mono" style={{ color: "var(--ink-4)" }}>
              {c.cards.length}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {c.cards.map((card, i) => (
              <div
                key={i}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: "8px 9px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ display: "flex", gap: 4, marginBottom: 5, flexWrap: "wrap" }}>
                  {card.labels.map((l) => (
                    <span
                      key={l}
                      style={{ width: 22, height: 4, background: colorFor(l), borderRadius: 2 }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: "var(--ink)",
                    lineHeight: 1.35,
                  }}
                >
                  {card.t}
                </div>
                {"progress" in card && card.progress != null && (
                  <div
                    style={{
                      marginTop: 6,
                      height: 3,
                      background: "var(--surface-2)",
                      borderRadius: 2,
                    }}
                  >
                    <div
                      style={{
                        width: `${card.progress * 100}%`,
                        height: "100%",
                        background: "var(--accent)",
                        borderRadius: 2,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
