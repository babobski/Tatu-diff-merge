/*jslint browser: true */


let getOffsetTop = (el) => {
    if (!el) {
        return 0;
    }

    let yOffset = el.offsetTop,
        parent = el.offsetParent;

    yOffset += getOffsetTop(parent);

    return (yOffset - 30);
}

let getScrollTop = (scrollable) => {
    return scrollable.scrollY || scrollable.scrollTop || document.body.scrollTop || document.documentElement.scrollTop;
}

let getScrollLeft = (scrollable) => {
    return scrollable.scrollLeft || 0;
}

let scrollTo = (scrollable, coords, millisecondsToTake) => {
    let currentY = getScrollTop(scrollable),
        diffY = coords.y - currentY,
        startTimestamp = null;
        //console.log(diffY);

    if (coords.y === currentY || typeof scrollable.scrollTo !== 'function') {
        return;
    }

    let doScroll = (currentTimestamp) => {
        if (startTimestamp === null) {
            startTimestamp = currentTimestamp;
        }

        let progress = currentTimestamp - startTimestamp,
            fractionDone = (progress / millisecondsToTake),
            pointOnSineWave = Math.sin(fractionDone * Math.PI / 2);
        scrollable.scroll(coords.x, currentY + (diffY * pointOnSineWave));

        if (progress < millisecondsToTake) {
            window.requestAnimationFrame(doScroll);
        } else {
            // Ensure we're at our destination
            scrollable.scroll(coords.x, coords.y);
        }
    }

    window.requestAnimationFrame(doScroll);
}

let scrollToX = (scrollable, newPos, millisecondsToTake, direction) => {
    let currentX = getScrollLeft(scrollable),
        startTimestamp = null,
		dist = direction === 'right' ? newPos - currentX : currentX - newPos;

    //if (dist === currentX) {
    //    console.log('return');
    //    return;
    //}

    let doScroll = (currentTimestamp) => {
        if (startTimestamp === null) {
            startTimestamp = currentTimestamp;
        }

        let progress = currentTimestamp - startTimestamp,
            fractionDone = (progress / millisecondsToTake),
            pointOnSineWave = Math.sin(fractionDone * Math.PI / 2);
        scrollable.scrollLeft = direction === 'right' ? (currentX + (dist * pointOnSineWave)) : (currentX - (dist * pointOnSineWave));

        if (progress < millisecondsToTake) {
            window.requestAnimationFrame(doScroll);
        } else {
            // Ensure we're at our destination
            scrollable.scrollLeft = newPos;
        }
    }

    window.requestAnimationFrame(doScroll);
}

let smoothScroll = (target) => {
    if (!target) {
        return;
    }
    scrollTo(window, {x: 0, y: getOffsetTop(target)}, 700);
}

let smoothScrollX = (el, dist, direction) => {
	scrollToX(el, dist, 700, direction);
}

