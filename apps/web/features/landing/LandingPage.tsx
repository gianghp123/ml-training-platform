import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  BrainCircuit,
  ChartNoAxesCombined,
  CircleCheck,
  Database,
  GitBranch,
  Layers3,
  LockKeyhole,
  Play,
  Sparkles,
  TerminalSquare,
  Waypoints,
} from "lucide-react"
import Link from "next/link"

import { ROUTES } from "@/lib/route"

import { LandingSceneHost } from "./LandingSceneHost"
import styles from "./landing.module.css"

interface Feature {
  icon: LucideIcon
  eyebrow: string
  title: string
  description: string
  accent: string
}

const FEATURES: Feature[] = [
  {
    icon: Waypoints,
    eyebrow: "Visual orchestration",
    title: "Build pipelines as fast as you can think",
    description:
      "Compose datasets, transformations, training and evaluation blocks on one spatial canvas.",
    accent: "violet",
  },
  {
    icon: Database,
    eyebrow: "Data workspace",
    title: "Bring every training asset into focus",
    description:
      "Inspect datasets, map inputs and keep the data behind every experiment visible.",
    accent: "amber",
  },
  {
    icon: BrainCircuit,
    eyebrow: "Model training",
    title: "Configure without losing the big picture",
    description:
      "Tune block parameters in context while the complete machine-learning flow stays readable.",
    accent: "indigo",
  },
  {
    icon: ChartNoAxesCombined,
    eyebrow: "Evaluation",
    title: "Turn run signals into decisions",
    description:
      "Read metrics, runtime status and validation feedback exactly where the work happens.",
    accent: "cyan",
  },
  {
    icon: TerminalSquare,
    eyebrow: "Observability",
    title: "Watch the system think in real time",
    description:
      "Follow streaming logs, node progress and produced artifacts from one operational console.",
    accent: "emerald",
  },
  {
    icon: LockKeyhole,
    eyebrow: "Graph safety",
    title: "Keep every connection explicit",
    description:
      "Typed input and output ports make model lineage legible from raw data to saved artifact.",
    accent: "rose",
  },
]

const PIPELINE_STEPS = [
  { number: "01", title: "Load data", meta: "Dataset", accent: "amber" },
  {
    number: "02",
    title: "Transform",
    meta: "Feature matrix",
    accent: "violet",
  },
  { number: "03", title: "Train model", meta: "Model", accent: "indigo" },
  { number: "04", title: "Evaluate", meta: "Metrics", accent: "cyan" },
  {
    number: "05",
    title: "Ship artifact",
    meta: "Saved model",
    accent: "emerald",
  },
] as const

export function LandingPage() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#landing-content">
        Skip to content
      </a>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link
            href={ROUTES.HOME}
            className={styles.brand}
            aria-label="ML Studio home"
          >
            <span className={styles.brandMark} aria-hidden="true">
              <GitBranch />
              <span />
            </span>
            <span>
              <strong>ML Studio</strong>
              <small>Training platform</small>
            </span>
          </Link>

          <nav className={styles.nav} aria-label="Landing navigation">
            <a href="#capabilities">Capabilities</a>
            <a href="#workflow">Workflow</a>
            <a href="#observability">Observability</a>
          </nav>

          <div className={styles.headerActions}>
            <Link
              href={ROUTES.WORKFLOW.LIST}
              className={styles.secondaryAction}
            >
              Dashboard
            </Link>
            <Link
              href={ROUTES.WORKFLOW.CREATE}
              className={styles.primaryAction}
            >
              Open studio
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main id="landing-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroGrid} aria-hidden="true" />
          <div className={styles.heroAurora} aria-hidden="true" />
          <LandingSceneHost />

          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div className={styles.releaseBadge}>
                <span className={styles.releasePulse} aria-hidden="true" />
                Spatial ML orchestration
                <span className={styles.releaseVersion}>Studio 01</span>
              </div>

              <h1 id="hero-title">
                From raw data to a<span> production-ready model.</span>
              </h1>
              <p className={styles.heroLead}>
                Design, validate and operate machine-learning pipelines on one
                visual canvas—without losing sight of data, metrics or
                artifacts.
              </p>

              <div className={styles.heroActions}>
                <Link
                  href={ROUTES.WORKFLOW.CREATE}
                  className={styles.heroPrimaryAction}
                >
                  Start building
                  <ArrowRight aria-hidden="true" />
                </Link>
                <Link
                  href={ROUTES.WORKFLOW.CREATE}
                  className={styles.heroDemoAction}
                >
                  <span aria-hidden="true">
                    <Play />
                  </span>
                  Explore the studio
                </Link>
              </div>

              <div
                className={styles.heroProof}
                aria-label="Platform capabilities"
              >
                <span>
                  <CircleCheck aria-hidden="true" /> Typed connections
                </span>
                <span>
                  <CircleCheck aria-hidden="true" /> Live execution
                </span>
                <span>
                  <CircleCheck aria-hidden="true" /> Artifact lineage
                </span>
              </div>
            </div>

            <div className={styles.heroSceneSpace} aria-hidden="true" />
          </div>

          <div className={styles.heroMetrics}>
            <div>
              <strong>01</strong>
              <span>Canvas for the entire lifecycle</span>
            </div>
            <div>
              <strong>Live</strong>
              <span>Node-level run telemetry</span>
            </div>
            <div>
              <strong>Typed</strong>
              <span>Dataset, model and metric ports</span>
            </div>
            <div>
              <strong>Local</strong>
              <span>Fast workflow iteration</span>
            </div>
          </div>
        </section>

        <section
          className={styles.signalStrip}
          aria-label="Machine learning lifecycle"
        >
          <span>Dataset</span>
          <i aria-hidden="true" />
          <span>Feature engineering</span>
          <i aria-hidden="true" />
          <span>Training</span>
          <i aria-hidden="true" />
          <span>Evaluation</span>
          <i aria-hidden="true" />
          <span>Artifacts</span>
        </section>

        <section
          id="capabilities"
          className={styles.section}
          aria-labelledby="capabilities-title"
        >
          <div className={styles.sectionIntro}>
            <div>
              <span className={styles.eyebrow}>A clearer operating model</span>
              <h2 id="capabilities-title">
                Everything important stays visible.
              </h2>
            </div>
            <p>
              ML Studio brings graph design, configuration and runtime feedback
              together, so teams spend less time translating between
              disconnected tools.
            </p>
          </div>

          <div className={styles.featureGrid}>
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <article
                  key={feature.title}
                  className={styles.featureCard}
                  data-accent={feature.accent}
                >
                  <div className={styles.featureIcon}>
                    <Icon aria-hidden="true" />
                  </div>
                  <span>{feature.eyebrow}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <div className={styles.featureTrace} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section
          id="workflow"
          className={styles.journeySection}
          aria-labelledby="journey-title"
        >
          <div className={styles.journeyGlow} aria-hidden="true" />
          <div className={styles.sectionIntro}>
            <div>
              <span className={styles.eyebrow}>One connected journey</span>
              <h2 id="journey-title">See the model take shape.</h2>
            </div>
            <p>
              Every stage is a concrete block, every edge is a typed contract,
              and every output can be traced back to its source.
            </p>
          </div>

          <div className={styles.pipelineJourney}>
            {PIPELINE_STEPS.map((step, index) => (
              <div className={styles.journeyItem} key={step.number}>
                <article
                  className={styles.journeyCard}
                  data-accent={step.accent}
                >
                  <div>
                    <span>{step.number}</span>
                    <i aria-hidden="true" />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.meta}</p>
                  <b aria-hidden="true" />
                </article>
                {index < PIPELINE_STEPS.length - 1 && (
                  <div className={styles.journeyEdge} aria-hidden="true">
                    <span />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.journeyFooter}>
            <span>
              <Layers3 aria-hidden="true" /> Reusable building blocks
            </span>
            <span>
              <GitBranch aria-hidden="true" /> Explicit model lineage
            </span>
            <span>
              <Sparkles aria-hidden="true" /> Runtime-aware visuals
            </span>
          </div>
        </section>

        <section
          id="observability"
          className={styles.observabilitySection}
          aria-labelledby="observability-title"
        >
          <div className={styles.observabilityCopy}>
            <span className={styles.eyebrow}>Built-in observability</span>
            <h2 id="observability-title">
              Stay with the run from queue to artifact.
            </h2>
            <p>
              Follow node transitions, stream execution logs and review model
              outputs without leaving the pipeline canvas.
            </p>

            <ul>
              <li>
                <CircleCheck aria-hidden="true" /> Node-level queued, running
                and completed states
              </li>
              <li>
                <CircleCheck aria-hidden="true" /> Streaming operational logs
              </li>
              <li>
                <CircleCheck aria-hidden="true" /> Metrics and produced
                artifacts in context
              </li>
            </ul>

            <Link href={ROUTES.WORKFLOW.CREATE} className={styles.textAction}>
              See the pipeline studio
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          <div
            className={styles.consoleShell}
            aria-label="Example pipeline run console"
          >
            <div className={styles.consoleHeader}>
              <div>
                <i />
                <i />
                <i />
              </div>
              <span>run / iris-classifier / 7fa3c2</span>
              <b>LIVE</b>
            </div>
            <div className={styles.consoleBody}>
              <div className={styles.metricRail}>
                <article>
                  <span>Accuracy</span>
                  <strong>0.967</strong>
                  <small>+2.4%</small>
                </article>
                <article>
                  <span>F1 score</span>
                  <strong>0.961</strong>
                  <small>stable</small>
                </article>
                <article>
                  <span>Duration</span>
                  <strong>18.4s</strong>
                  <small>-1.2s</small>
                </article>
              </div>

              <div className={styles.terminal}>
                <div>
                  <span>12:04:16</span>
                  <b>system</b>
                  <p>Execution plan accepted · 5 nodes</p>
                </div>
                <div>
                  <span>12:04:17</span>
                  <b data-tone="info">load_csv</b>
                  <p>Dataset loaded · 150 rows × 5 columns</p>
                </div>
                <div>
                  <span>12:04:21</span>
                  <b data-tone="violet">train</b>
                  <p>Random forest fitted · 100 estimators</p>
                </div>
                <div>
                  <span>12:04:34</span>
                  <b data-tone="success">evaluate</b>
                  <p>Metrics artifact emitted successfully</p>
                </div>
                <div className={styles.terminalCursor} aria-hidden="true">
                  <span>12:04:35</span>
                  <i />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.ctaSection} aria-labelledby="cta-title">
          <div className={styles.ctaGrid} aria-hidden="true" />
          <div className={styles.ctaOrb} aria-hidden="true">
            <span />
            <i />
          </div>
          <span className={styles.eyebrow}>Ready when you are</span>
          <h2 id="cta-title">Build your first intelligent pipeline.</h2>
          <p>
            Move from dataset to trained artifact in one connected workspace.
          </p>
          <div className={styles.ctaActions}>
            <Link
              href={ROUTES.WORKFLOW.CREATE}
              className={styles.heroPrimaryAction}
            >
              Open pipeline studio
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href={ROUTES.WORKFLOW.LIST} className={styles.heroDemoAction}>
              View dashboard
            </Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <span className={styles.brandMark} aria-hidden="true">
            <GitBranch />
            <span />
          </span>
          <span>
            <strong>ML Studio</strong>
            <small>Visual model operations</small>
          </span>
        </div>
        <p>Designed for clear, observable machine-learning workflows.</p>
        <div>
          <Link href={ROUTES.WORKFLOW.LIST}>Dashboard</Link>
          <Link href={ROUTES.DATASET.LIST}>Datasets</Link>
          <Link href={ROUTES.WORKFLOW.CREATE}>Builder</Link>
        </div>
      </footer>
    </div>
  )
}
