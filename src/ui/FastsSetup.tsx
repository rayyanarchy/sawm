import type { Sawm, Settings } from '../core'
import s from './FastsSetup.module.css'
import { Switch } from './Switch'

/** Setup step 2: which Fast Types the user keeps. */
export function FastsSetup({ sawm }: { sawm: Sawm; settings: Settings }) {
  return (
    <section className={s.setup}>
      <p className={s.brand}>Sawm</p>
      <h1 className={s.question}>Which fasts do you keep?</h1>
      <p className={s.lead}>Sawm plans them, counts down through them and reminds you. You can change this any time in Settings.</p>
      <div className={s.list}>
        {sawm.fastTypes().map((type) => (
          <Switch
            key={type.id}
            label={type.label}
            description={type.description}
            checked={type.followed}
            onChange={(followed) => void sawm.setFollowing(type.id, followed)}
          />
        ))}
      </div>
      <button type="button" className={s.primary} onClick={() => void sawm.completeSetup('fasts')}>
        Continue
      </button>
    </section>
  )
}
