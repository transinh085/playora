/** Keyframes for every mechanism, injected once by `Mechanism` (names prefixed `mech-`). */
export const MECH_KEYFRAMES = `
@keyframes mech-pop { 0% { opacity: 0; transform: scale(.6) } 70% { opacity: 1; transform: scale(1.06) } 100% { transform: none } }
@keyframes mech-wheel-bulb { from { opacity: 1 } to { opacity: .25 } }
@keyframes mech-wheel-pulse { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.08) } }
@keyframes mech-wheel-flash { 0%, 100% { opacity: .05 } 50% { opacity: .45 } }
@keyframes mech-float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-3%) } }
@keyframes mech-shake { 0%, 100% { transform: rotate(0) } 20% { transform: rotate(-7deg) } 40% { transform: rotate(6deg) } 60% { transform: rotate(-5deg) } 80% { transform: rotate(4deg) } }
@keyframes mech-lid-off { 0% { transform: none } 40% { transform: translateY(-30%) rotate(-8deg) } 100% { transform: translate(-30%, -120%) rotate(-35deg); opacity: 0 } }
@keyframes mech-rays { from { transform: rotate(0) } to { transform: rotate(360deg) } }
`;
