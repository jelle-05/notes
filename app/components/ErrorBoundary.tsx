'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  fout: boolean
}

// Vangt onverwachte render-fouten op zodat de app geen wit scherm toont,
// maar een nette melding met een herlaadknop.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { fout: false }

  static getDerivedStateFromError(): State {
    return { fout: true }
  }

  componentDidCatch(error: Error) {
    // Alleen de foutnaam/het bericht loggen — geen gebruikersdata.
    console.error('[app] onverwachte fout:', error.message)
  }

  render() {
    if (this.state.fout) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-4 bg-white p-6 text-center">
          <h1 className="text-[17px] font-semibold text-gray-900">Er ging iets mis</h1>
          <p className="text-[14px] text-gray-500 max-w-[280px]">
            De app liep tegen een onverwachte fout aan. Herlaad de app om verder te gaan; je gegevens blijven bewaard.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#007AFF] hover:bg-[#0066D6] text-white rounded-xl px-5 py-3 text-[15px] font-medium transition-colors"
          >
            Herlaad de app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
