// /make: the one place to make a lesson. Two ways in, as tabs on one page:
// pick spelling rules, or type or paste your own words. Either way the result
// is an ordinary lesson with practice, a word search, a crossword and print
// sheets. (/rules and /custom redirect here.)
import { useSearchParams } from 'react-router-dom';
import { InfoPage } from '@/components/InfoPage';
import { BackupBar } from '@/components/BackupBar';
import { RulesBuilder } from '@/pages/RulesPage';
import { CustomBuilder } from '@/pages/CustomListsPage';

const TABS = [
  { id: 'rules', label: 'Choose by spelling rule', hint: 'For a pattern like /ee/ or -le endings.' },
  { id: 'words', label: 'Type or paste words', hint: "For this week's school list or tricky words." },
];

export default function MakeLessonPage() {
  const [params, setParams] = useSearchParams();
  // A lesson being edited always opens on the words tab.
  const tab = params.get('edit') ? 'words' : params.get('tab') === 'words' ? 'words' : 'rules';

  const choose = (id) => {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    if (id === 'rules') next.delete('edit');
    setParams(next, { replace: true });
  };

  return (
    <InfoPage
      path="/make"
      title="Make a lesson"
      description="Make a spelling lesson from spelling rules or from your own words. Each lesson has practice, a word search, a crossword and print sheets. Free, no account needed, and kept on your device unless you sign in."
      eyebrow="Make a lesson"
      heading="Make a lesson"
      intro="Choose spelling rules, or type in the words your child has been given. Each lesson comes with practice, a word search, a crossword and print sheets. It stays on this device unless you sign in to use it elsewhere."
    >
      <section className="px-5 pb-6 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <BackupBar />
          <div role="tablist" aria-label="How to make a lesson" className="grid gap-3 sm:grid-cols-2" data-testid="make-tabs">
            {TABS.map((t) => {
              const on = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={'make-tab-' + t.id}
                  aria-selected={on}
                  aria-controls="make-panel"
                  onClick={() => choose(t.id)}
                  className={
                    'rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
                    (on ? 'border-primary bg-primary/10' : 'border-border bg-muted/30 hover:border-primary/50')
                  }
                  data-testid={'make-tab-' + t.id}
                >
                  <span className="block text-base font-semibold text-foreground">{t.label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{t.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
      <div role="tabpanel" id="make-panel" aria-labelledby={'make-tab-' + tab}>
        {tab === 'rules' ? <RulesBuilder /> : <CustomBuilder />}
      </div>
    </InfoPage>
  );
}
