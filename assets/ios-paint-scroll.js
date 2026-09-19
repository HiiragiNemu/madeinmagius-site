// Adapted from Reader ios-paint-scroll.ts by the same project owner.
// Reader true-device feedback: stop-jump benefit, unacceptable latency with its
// long graph. This smaller-graph site trial stays explicitly opt-in.
/** Keep scroll content in the root optical paint instead of an independent iOS
 * async scrolling surface. Original DOM offsets, textures and filters survive. */
const candidates = '.terminal-ui,.content-panel,.content-inner pre,.integrity-table-wrap';
const input = 'input,textarea,select,[contenteditable="true"],[role="slider"]';
export function paintScrollRequested(ios, search) {
    // Opt-in diagnostic candidate. No stored setting or default activation.
    return ios && new URLSearchParams(search).get('iosPaintScroll') === '1';
}
/** Integrate a fixed decay across variable frame intervals without quantization. */
export function coastStep(velocity, elapsed) {
    const time = Math.max(0, Math.min(elapsed, 48));
    const decay = Math.exp(-time / 240);
    return { distance: velocity * 240 * (1 - decay), velocity: velocity * decay };
}
export function startIOSPaintScroll(root) {
    const owned = new Map();
    let gesture = null;
    let frame = 0, refreshFrame = 0, clickUntil = 0;
    const stop = () => { cancelAnimationFrame(frame); frame = 0; };
    const restore = (entry) => {
        for (const [name, value, priority] of entry.styles) {
            if (entry.element.style.getPropertyValue(name) !== 'hidden' ||
                entry.element.style.getPropertyPriority(name) !== 'important')
                continue;
            if (value)
                entry.element.style.setProperty(name, value, priority);
            else
                entry.element.style.removeProperty(name);
        }
        delete entry.element.dataset.iosPaintScroll;
    };
    const refresh = () => {
        refreshFrame = 0;
        for (const [element, entry] of owned)
            if (!root.contains(element)) {
                restore(entry);
                owned.delete(element);
            }
        root.querySelectorAll(candidates).forEach(element => {
            if (owned.has(element))
                return;
            const style = getComputedStyle(element);
            const x = /^(auto|scroll)$/.test(style.overflowX);
            const y = /^(auto|scroll)$/.test(style.overflowY);
            if (!x && !y)
                return;
            // Hidden remains programmatically scrollable. Existing anchors, selection,
            // pagination and optical scrollbar controls keep their original target.
            const styles = ['overflow-x', 'overflow-y'].map(name => [name, element.style.getPropertyValue(name), element.style.getPropertyPriority(name)]);
            owned.set(element, { element, x, y, styles });
            element.style.setProperty('overflow-x', 'hidden', 'important');
            element.style.setProperty('overflow-y', 'hidden', 'important');
            element.dataset.iosPaintScroll = 'root-owned';
        });
    };
    const chainAt = (target) => {
        const chain = [];
        for (let element = target instanceof Element ? target : null; element && element !== root; element = element.parentElement) {
            const entry = owned.get(element);
            if (entry)
                chain.push(entry);
        }
        return chain;
    };
    const move = (chain, axis, delta) => {
        let remaining = delta;
        for (const entry of chain) {
            if (!entry[axis])
                continue;
            const element = entry.element;
            const before = axis === 'y' ? element.scrollTop : element.scrollLeft;
            const maximum = Math.max(0, axis === 'y' ? element.scrollHeight - element.clientHeight
                : element.scrollWidth - element.clientWidth);
            const next = Math.max(0, Math.min(maximum, before + remaining));
            element.scrollTo({ top: axis === 'y' ? next : element.scrollTop,
                left: axis === 'x' ? next : element.scrollLeft, behavior: 'instant' });
            const consumed = (axis === 'y' ? element.scrollTop : element.scrollLeft) - before;
            remaining -= consumed;
            if (Math.abs(remaining) < .5)
                break;
        }
        return delta - remaining;
    };
    const touchStart = (event) => {
        stop();
        gesture = null;
        clickUntil = 0;
        if (event.touches.length !== 1 || !(event.target instanceof Element) || event.target.closest(input))
            return;
        const chain = chainAt(event.target);
        if (!chain.length)
            return;
        const touch = event.touches[0], time = performance.now();
        gesture = { startX: touch.clientX, startY: touch.clientY, x: touch.clientX, y: touch.clientY,
            time, started: time, axis: null, chain, moved: false, velocity: 0 };
    };
    const touchMove = (event) => {
        const current = gesture;
        if (!current)
            return;
        if (event.touches.length !== 1 || event.defaultPrevented) {
            gesture = null;
            return;
        }
        const touch = event.touches[0], time = performance.now();
        if (!current.axis) {
            if (time - current.started > 400 && !getSelection()?.isCollapsed) {
                gesture = null;
                return;
            }
            const x = Math.abs(touch.clientX - current.startX), y = Math.abs(touch.clientY - current.startY);
            if (Math.max(x, y) < 8)
                return;
            current.axis = x > y ? 'x' : 'y';
            if (!current.chain.some(entry => entry[current.axis])) {
                gesture = null;
                return;
            }
        }
        if (!event.cancelable) {
            gesture = null;
            return;
        }
        event.preventDefault();
        const delta = current.axis === 'y' ? current.y - touch.clientY : current.x - touch.clientX;
        const consumed = move(current.chain, current.axis, delta);
        const elapsed = Math.max(1, time - current.time);
        const speed = Math.max(-3, Math.min(3, consumed / elapsed));
        current.velocity = current.moved ? current.velocity * .35 + speed * .65 : speed;
        current.x = touch.clientX;
        current.y = touch.clientY;
        current.time = time;
        current.moved = true;
    };
    const touchEnd = () => {
        const current = gesture;
        gesture = null;
        if (!current?.moved || !current.axis)
            return;
        clickUntil = performance.now() + 400;
        if (performance.now() - current.time > 100 || matchMedia('(prefers-reduced-motion: reduce)').matches)
            return;
        let velocity = current.velocity, previous = performance.now();
        const tick = (time) => {
            frame = 0;
            const step = coastStep(velocity, time - previous);
            previous = time;
            velocity = step.velocity;
            const consumed = move(current.chain, current.axis, step.distance);
            if (Math.abs(velocity) > .02 && Math.abs(consumed) > .1)
                frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
    };
    const cancel = () => { gesture = null; stop(); };
    const click = (event) => {
        if (performance.now() < clickUntil) {
            event.preventDefault();
            event.stopPropagation();
        }
    };
    const wheel = (event) => {
        if (event.ctrlKey || event.defaultPrevented || !event.cancelable)
            return;
        const chain = chainAt(event.target);
        if (!chain.length)
            return;
        stop();
        const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? root.clientHeight : 1;
        const axis = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? 'x' : 'y';
        if (move(chain, axis, (axis === 'x' ? event.deltaX : event.deltaY) * factor))
            event.preventDefault();
    };
    const keyboard = (event) => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
            !(event.target instanceof Element) || event.target.closest(`${input},button,a`))
            return;
        const chain = chainAt(event.target), target = chain.find(entry => entry.y)?.element;
        if (!target)
            return;
        const deltas = { ArrowDown: 40, ArrowUp: -40,
            PageDown: target.clientHeight * .9, PageUp: -target.clientHeight * .9,
            ' ': target.clientHeight * .9 * (event.shiftKey ? -1 : 1), Home: -target.scrollHeight, End: target.scrollHeight };
        if (!(event.key in deltas))
            return;
        stop();
        event.preventDefault();
        move(chain, 'y', deltas[event.key]);
    };
    const mutation = new MutationObserver(() => {
        if (!refreshFrame)
            refreshFrame = requestAnimationFrame(refresh);
    });
    refresh();
    mutation.observe(root, { childList: true, subtree: true });
    root.dataset.iosScrollComposition = 'root-owned';
    root.addEventListener('touchstart', touchStart, { passive: true });
    root.addEventListener('touchmove', touchMove, { passive: false });
    root.addEventListener('touchend', touchEnd, { passive: true });
    root.addEventListener('touchcancel', cancel, { passive: true });
    root.addEventListener('click', click, true);
    root.addEventListener('wheel', wheel, { passive: false });
    root.addEventListener('keydown', keyboard);
    document.addEventListener('visibilitychange', cancel);
    return () => {
        cancel();
        cancelAnimationFrame(refreshFrame);
        mutation.disconnect();
        root.removeEventListener('touchstart', touchStart);
        root.removeEventListener('touchmove', touchMove);
        root.removeEventListener('touchend', touchEnd);
        root.removeEventListener('touchcancel', cancel);
        root.removeEventListener('click', click, true);
        root.removeEventListener('wheel', wheel);
        root.removeEventListener('keydown', keyboard);
        document.removeEventListener('visibilitychange', cancel);
        owned.forEach(restore);
        owned.clear();
        delete root.dataset.iosScrollComposition;
    };
}
