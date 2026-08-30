import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from './store'
import { readInviteFromLocation } from './invite/codec'
import { IntroScreen } from './screens/IntroScreen'
import { QuestionnaireScreen } from './screens/QuestionnaireScreen'
import { SimScene } from './screens/SimScene'
import { BaselineReportScreen } from './screens/BaselineReportScreen'
import { ScenarioGateScreen } from './screens/ScenarioGateScreen'
import { ScenarioReportScreen } from './screens/ScenarioReportScreen'
import { MiracleScreen } from './screens/MiracleScreen'
import { EndingScreen } from './screens/EndingScreen'
import { relToInit } from './store'
import { SIM_BEFORE, SCENARIO_TURN } from './copy'

const RUNS = 10000

export default function App() {
  const screen = useApp((s) => s.screen)
  const theme = useApp((s) => s.theme)
  const startQuestionnaire = useApp((s) => s.startQuestionnaire)

  // invite link: partner opens → jump straight into the questionnaire with
  // the sender's 小Q answers pre-filled
  useEffect(() => {
    const invite = readInviteFromLocation()
    if (invite) {
      startQuestionnaire(invite.s, { side: 'q', answers: invite.q })
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [startQuestionnaire])

  return (
    <div className={`app theme-${theme}`}>
      <AnimatePresence mode="wait">
        <motion.main
          key={screen}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <Router />
        </motion.main>
      </AnimatePresence>
    </div>
  )
}

function Router() {
  const s = useApp()
  switch (s.screen) {
    case 'intro':
      return <IntroScreen />
    case 'questionnaire':
      return <QuestionnaireScreen />
    case 'baselineLoading':
      if (!s.persons) return null
      return (
        <SimScene
          theme="warm"
          lead={SIM_BEFORE}
          total={RUNS}
          masterSeed={s.masterSeed}
          persons={s.persons}
          init={relToInit(s.rel)}
          onComplete={s.setBaseline}
        />
      )
    case 'baselineReport':
      return <BaselineReportScreen />
    case 'scenarioGate':
      return <ScenarioGateScreen />
    case 'scenarioLoading':
      if (!s.persons) return null
      return (
        <SimScene
          theme="gray"
          lead={`${SCENARIO_TURN} 压力之下，同样的世界重新流转。`}
          total={RUNS}
          masterSeed={s.masterSeed}
          persons={s.persons}
          init={relToInit(s.rel)}
          scenarioSelection={s.scenarioSelection}
          onComplete={s.setScenarioResult}
        />
      )
    case 'scenarioReport':
      return <ScenarioReportScreen />
    case 'miracle':
      return <MiracleScreen />
    case 'ending':
      return <EndingScreen />
    default:
      return null
  }
}
