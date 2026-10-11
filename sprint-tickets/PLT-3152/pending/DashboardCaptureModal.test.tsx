/**
 * Tests for the capture modal's abandonment guard.
 *
 * The behaviour worth protecting is narrow but easy to lose: a capture that is
 * still running when the modal closes must not fill the slot when it finally
 * arrives. The screenshot takes long enough that cancelling mid-capture is a
 * normal thing to do, and a picture the planner said no to landing in the deck
 * is both wrong and hard to attribute afterwards.
 *
 * `ClientReportPage.test.tsx` stubs this modal out entirely, so nothing else in
 * the suite exercises the guard — removing it left every test green.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import languageObj from 'mlt/en/main.json'
import { TranslatorContext } from 'react-jhipster'

import type { CapturableViewer, ForgeCapture } from '../forgeCapture'

import DashboardCaptureModal from './DashboardCaptureModal'

// The modal lazily mounts the real dashboard. That tree is irrelevant here and
// far too heavy to pull into a unit test, so it is replaced wholesale.
vi.mock('app/pages/organisation/ViewerPage/DashboardPage', () => ({
  default: () => <div data-testid='dashboard-stub' />,
}))

const getDashboardViewer = vi.fn<[], CapturableViewer | null>()
const captureViewpoint = vi.fn<[CapturableViewer], Promise<ForgeCapture>>()

vi.mock('../forgeCapture', () => ({
  getDashboardViewer: (...args: []) => getDashboardViewer(...args),
  captureViewpoint: (...args: [CapturableViewer]) => captureViewpoint(...args),
  captureErrorMessage: (error: unknown) => String(error),
}))

// See PlannerPanel.test.tsx — registering per test sidesteps the race between
// the translation effect and the first synchronous render.
beforeEach(() => {
  TranslatorContext.registerTranslations('en', languageObj)
  TranslatorContext.setDefaultLocale('en')
  TranslatorContext.setLocale('en')
  getDashboardViewer.mockReturnValue({} as CapturableViewer)
  captureViewpoint.mockReset()
})

afterAll(() => {
  TranslatorContext.context = {
    ...TranslatorContext.context,
    translations: {},
    locale: null,
    previousLocale: null,
  }
})

const SHOT: ForgeCapture = { dataUrl: 'data:image/png;base64,AAA', width: 1600, height: 900 }

/** A capture whose resolution this test controls, standing in for a slow screenshot. */
function deferredCapture() {
  let settle: (shot: ForgeCapture) => void = () => {}
  const promise = new Promise<ForgeCapture>(resolve => {
    settle = resolve
  })
  captureViewpoint.mockReturnValue(promise)
  return { settle: () => settle(SHOT), promise }
}

async function renderModal() {
  const onCapture = vi.fn()
  const onClose = vi.fn()
  const utils = render(
    <DashboardCaptureModal
      slot='cover'
      slotLabel='Cover image'
      onCapture={onCapture}
      onClose={onClose}
    />,
  )

  // The modal polls for the dashboard's viewer every 400ms and only then
  // enables the action, so the button starts disabled whatever the mock says.
  const confirm = await screen.findByTestId('client-report-capture-confirm')
  await waitFor(() => expect(confirm).toBeEnabled())

  return { ...utils, confirm, onCapture, onClose }
}

describe('DashboardCaptureModal', () => {
  it('drops a capture that completes after the modal has closed', async () => {
    const { confirm, unmount, onCapture } = await renderModal()
    const deferred = deferredCapture()

    fireEvent.click(confirm)
    await waitFor(() => expect(captureViewpoint).toHaveBeenCalledTimes(1))

    // The planner cancels — or presses Escape, or clicks the scrim — while the
    // screenshot is still being taken. All three paths unmount the modal.
    unmount()
    deferred.settle()
    await deferred.promise

    expect(onCapture).not.toHaveBeenCalled()
  })

  it('fills the slot when the capture completes while the modal is still open', async () => {
    // The contrast case: without it the test above would also pass if the
    // capture never resolved at all, or if onCapture were never wired up.
    const { confirm, onCapture, onClose } = await renderModal()
    const deferred = deferredCapture()

    fireEvent.click(confirm)
    await waitFor(() => expect(captureViewpoint).toHaveBeenCalledTimes(1))

    deferred.settle()

    await waitFor(() => expect(onCapture).toHaveBeenCalledWith('cover', SHOT))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
