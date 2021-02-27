/*jslint browser: true */


function getOffsetTop(el) {
    if (!el) {
        return 0;
    }

    var yOffset = el.offsetTop,
        parent = el.offsetParent;

    yOffset += getOffsetTop(parent);

    return (yOffset - 30);
}

function getScrollTop(scrollable) {
    return scrollable.scrollY || scrollable.scrollTop || document.body.scrollTop || document.documentElement.scrollTop;
}

function getScrollLeft(scrollable) {
    return scrollable.scrollLeft || 0;
}

function scrollTo(scrollable, coords, millisecondsToTake) {
    var currentY = getScrollTop(scrollable),
        diffY = coords.y - currentY,
        startTimestamp = null;
        //console.log(diffY);

    if (coords.y === currentY || typeof scrollable.scrollTo !== 'function') {
        return;
    }

    function doScroll(currentTimestamp) {
        if (startTimestamp === null) {
            startTimestamp = currentTimestamp;
        }

        var progress = currentTimestamp - startTimestamp,
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

function scrollToX(scrollable, newPos, millisecondsToTake, direction) {
    var currentX = getScrollLeft(scrollable),
        startTimestamp = null,
		dist = direction === 'right' ? newPos - currentX : currentX - newPos;

    //if (dist === currentX) {
    //    console.log('return');
    //    return;
    //}

    function doScroll(currentTimestamp) {
        if (startTimestamp === null) {
            startTimestamp = currentTimestamp;
        }

        var progress = currentTimestamp - startTimestamp,
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

function smoothScroll(target) {
    if (!target) {
        return;
    }
    scrollTo(window, {x: 0, y: getOffsetTop(target)}, 700);
}

function smoothScrollX(el, dist, direction) {
	scrollToX(el, dist, 700, direction);
}

