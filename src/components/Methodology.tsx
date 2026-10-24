import { METRICS } from '../data/metrics';
import { METHODOLOGY } from '../data/content';
import { ARCHETYPES } from '../data/model';
import { useStore } from '../state/store';
import { Dialog } from './Dialog';
import { directionWord } from './DeltaChip';

/** What the model is, what it can claim, and what it cannot. */
export function Methodology() {
  const { state, dispatch } = useStore();
  if (!state.methodologyOpen) return null;

  return (
    <Dialog
      open
      onClose={() => dispatch({ type: 'setMethodologyOpen', open: false })}
      title="Methodology & data honesty"
      variant="wide"
    >
      <div className="methodology">
        <p className="methodology-intro">{METHODOLOGY.intro}</p>

        <h3>You can rely on this</h3>
        <ul>
          {METHODOLOGY.whatYouCanClaim.map((item) => (
            <li key={item.slice(0, 24)}>{item}</li>
          ))}
        </ul>

        <h3>You cannot claim this</h3>
        <ul>
          {METHODOLOGY.whatYouCannotClaim.map((item) => (
            <li key={item.slice(0, 24)}>{item}</li>
          ))}
        </ul>

        <h3>How scenarios work</h3>
        <p>{METHODOLOGY.scenarios}</p>

        <h3>Geography & licences</h3>
        <p>{METHODOLOGY.geography}</p>

        <h3>Gaps and missing data</h3>
        <p>{METHODOLOGY.gaps}</p>

        <h3>Privacy</h3>
        <p>{METHODOLOGY.privacy}</p>

        <h3>Place families</h3>
        <p>
          Every place follows one of five families. The family sets the default baseline and the
          trajectory rules; the atlas then overrides values where a place’s own story demands it.
          Families are an editorial device, not a statistical classification.
        </p>
        <dl className="archetype-list">
          {Object.values(ARCHETYPES).map((a) => (
            <div key={a.id}>
              <dt>{a.label}</dt>
              <dd>{a.description}</dd>
            </div>
          ))}
        </dl>

        <h3>Indicator definitions</h3>
        <table className="metric-table">
          <caption className="sr-only">All twenty indicators with units and meaning</caption>
          <thead>
            <tr>
              <th scope="col">Indicator</th>
              <th scope="col">Unit</th>
              <th scope="col">Better</th>
              <th scope="col">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => (
              <tr key={m.id}>
                <th scope="row">{m.label}</th>
                <td>{m.unitFull}</td>
                <td>{directionWord(m.direction)}</td>
                <td>{m.explain}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}
