let inEdit = false;
let leftPos = { top: 0, left: 0, x: 0, y: 0 };
let rightPos = { top: 0, left: 0, x: 0, y: 0 };
let TatuDiff = {
    getEOL: (eol) => {
        let $return = '';
        switch (eol) {
            case 2:
                $return = '\r\n';
                break;
            case 1:
                $return = '\n';
                break;
        }

        return $return;
    },
    scrollToNext: () => {
        let leftSide = document.getElementById('left-side'),
            diffrences = leftSide.getElementsByClassName('difference');

        if (diffrences.length === 0) {
            return false;
        }
			
        if (currChange >= 0) {
            TatuDiff.checkIfinBlock(diffrences[currChange]);
        }
        
        for (var i = 0; i < diffrences.length; i++) {
            if (i > currChange) {
                smoothScroll(diffrences[i]);
                currChange = i;
                // if is block select next change
                TatuDiff.checkIfinBlock(diffrences[i]);
                break;
            }
        }
        TatuDiff.setAutoSelected(diffrences[currChange]);
    },
    scrollToPrev: () => {
        let leftSide = document.getElementById('left-side'),
            diffrences = leftSide.getElementsByClassName('difference');

        if (diffrences.length === 0) {
            return false;
        }

        if (currChange < 0) {
            currChange++;
            return false;
        }
        
        TatuDiff.checkIfinBlock(diffrences[currChange], 'up');
        
        for (let i = diffrences.length; i  >= 0; i--) {
            if (i < currChange) {
                currChange = i;
                
                TatuDiff.checkIfinBlock(diffrences[i], 'up');
                break;
            }
        }

        smoothScroll(diffrences[currChange]);      
        TatuDiff.setAutoSelected(diffrences[currChange], 'down');
    },
    scrollToRow: (index) => {
        let leftSide = document.getElementById('left-side');
        smoothScroll(leftSide.children[index]);
    },
    checkIfinBlock: (el, direction = 'down') => {
        if (direction === 'down') {
            while(el.nextElementSibling !== null && el.nextElementSibling.classList.contains('difference')) {
                currChange++;
                el = el.nextElementSibling;
            }
        } else {
            while(el.previousElementSibling !== null && el.previousElementSibling.classList.contains('difference')) {
                currChange--;
                el = el.previousElementSibling;
            }
        }
    },
    setAutoSelected: (el, direction = 'up') => {
        TatuDiff.removeOtherSelected();
        if (direction === 'down') {
            el.classList.add('selected');
            while(el.nextElementSibling !== null && el.nextElementSibling.classList.contains('difference')) {
                el = el.nextElementSibling;
                el.classList.add('selected');
            }
        } else {
            el.classList.add('selected');
            while(el.previousElementSibling !== null && el.previousElementSibling.classList.contains('difference')) {
                el = el.previousElementSibling;
                el.classList.add('selected');
            }
        }
        TatuDiff.enableButtons();
    },
    toggleEditable: (el) => {
        let parent = el.parentNode,
            lineEl = el.children[1],
            parentId = parent.id,
            rightSide = parentId === 'right-side';

        if (rightSide) {     
            if (lineEl.contentEditable === 'true') {
                lineEl.contentEditable = 'false';
                inEdit = false;
            } else {
                lineEl.contentEditable = 'true';
                lineEl.addEventListener('focusout', (e) => {
                    TatuDiff.saveEditable(lineEl);
                });
                lineEl.focus();
                inEdit = true;
            }
        }
    },
    saveEditable: (el) => {
        let saveTimeString = TatuDiff.getTimeString(),
            newVal = el.textContent,
            oldVal = el.dataset.text,
            index = [...el.parentNode.parentElement.children].indexOf(el.parentNode),
            language = el.dataset.lang;

        if (newVal === oldVal) {
            if (useHighlight) {
                let text = hljs.highlight(oldVal, {language: language}).value;
                el.innerHTML = text;
            }
            inEdit = false;
            return false;
        }

        let text = useHighlight ? hljs.highlight(newVal, {language: language}).value : newVal;
        el.parentNode.classList.add('saved');

        mergeResult[index] = newVal;
        el.dataset.text = newVal;
        el.contentEditable = 'false';
        inEdit = false;
        el.innerHTML = text;
        History.push({line: index, action: 'edit', time: saveTimeString, oldval: oldVal});
        TatuDiff.toggleHistoryBtn();
    },
    saveEditableOnKeypress: () => {
        let lines = document.getElementsByClassName('line');
        for (let i = 0; i < lines.length; i++) {
            const el = lines[i];

            if (el.contentEditable === 'true') {
                TatuDiff.saveEditable(el);
                break;
            }
            
        }
    },
    refreshHighLight: (e) => {
        let el = e.target,
            text = el.textContent,
            language = el.dataset.lang,
            caretPos = TatuDiff.getCaretPosition(el);

        text = hljs.highlight(text, {language: language}).value;
        el.innerHTML = text;

        TatuDiff.setCaret(el, caretPos);
    },
    setCaret: (node, pos) => {
        var range = document.createRange();
        var sel = window.getSelection();
        let childs = node.childNodes;
        let currLeng = 0;
        let currNode = '';

        for (let i = 0; i < childs.length; i++) {
            const child = childs[i];
        let childLength = child.length ? child.length : child.textContent.length;

        if (pos <= (currLeng + childLength)) {
            currNode = i;

            break;
        }

        currLeng = currLeng + childLength;
        }

        let offset = (pos- currLeng);
        let nodeToSet = node.childNodes[currNode];
        let newData = TatuDiff.getCorrectNode(nodeToSet, offset);

        nodeToSet = newData.node;
        offset = newData.offset;
        range.setStart(nodeToSet, offset);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        node.focus();
    },
    getCorrectNode: (node, offset) => {
        nodeTextTypes = [
            3, // text
            4, // CDATA
            7, // progressing instruction
            8, // Comment
        ];

        // If node is a textnode return node
        if (nodeTextTypes.indexOf(node.nodeType) !== -1 && node.length >= offset) {
            return {
                node: node,
                offset: offset
            };
        }

        // if childCount is 1 and node is a textnode return first child
        if (node.childElementCount === 1 && nodeTextTypes.indexOf(node.firstChild.nodeType) !== -1 && node.firstChild.length >= offset) {
            return {
                node: node.firstChild,
                offset: offset
            };
        }

        // Else loop over children to find the right element
        let children = node.childNodes;

        for (let i = 0; i < children.length; i++) {
            const child = children[i];

            // Get total text lenght of the node (including nested nodes)
            let childLength = child.length ? child.length : child.textContent.length;

            // If child lenght is bigger then the offset, the match is inside the node
            if (offset <= childLength) {
                // If child is a textnode return the node
                if (nodeTextTypes.indexOf(child.nodeType) !== -1 && node.length >= offset) {
                    return {
                        node: child,
                        offset: offset
                    }
                // Else the node is nested
                } else {
                    // if childCount is 1 and node is a textnode return first child
                    if (child.childElementCount === 1 && nodeTextTypes.indexOf(child.firstChild.nodeType) !== -1 && node.firstChild.length >= offset) {
                        return {
                            node: child.firstChild,
                            offset: offset
                        };
                    }

                    // There are more childs
                    return TatuDiff.getCorrectNode(child, offset);
                }
            } else {
                offset = offset - childLength;
            }
        }

        return null;

    },
    getCaretPosition: (element) => {
        let position = 0;
        const isSupported = typeof window.getSelection !== "undefined";
        if (isSupported) {
            const selection = window.getSelection();
            if (selection.rangeCount !== 0) {
            const range = window.getSelection().getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            position = preCaretRange.toString().length;
            }
        }
        return position;
    },
    setClickFunctions: () => {
        let table = document.getElementById('diff'),
            lines = table.getElementsByClassName('line');
        for (let i = 0; i < lines.length; i++) {
            lines[i].onclick  = (e) => {
                if (!inEdit) {
                    e.preventDefault();
                    let target = TatuDiff.getRow(e.target);
                    TatuDiff.setSelect(target, e.shiftKey);
                }
            };
            lines[i].ondblclick = (e) => {
                e.preventDefault();
                if (!inEdit) {
                    let target = TatuDiff.getRow(e.target);
                    TatuDiff.toggleEditable(target);
                }
            };
            lines[i].oninput = (e) => {
                if (useHighlight) {
                    TatuDiff.refreshHighLight(e);
                }
            };
            lines[i].onanimationend = (e) => {
                e.target.classList.remove('saved');
            };
        }
    },
    setSelect: (el, shift) => {
        if (shift) {
            if (lastSelected !== null) {
                TatuDiff.removeOtherSelected();
                TatuDiff.selectBlock(el, lastSelected);
                TatuDiff.enableButtons();
            }
        } else {
            if (el.classList.contains('selected')) {
                if (TatuDiff.inBlockSelect()) {
                    TatuDiff.removeOtherSelected();
                    el.classList.add('selected');
                    lastSelected = el;
                    TatuDiff.enableButtons();
                } else {
                    TatuDiff.removeOtherSelected();
                    lastSelected = null;
                    TatuDiff.disableButtons();
                }
            } else {
                TatuDiff.removeOtherSelected();
                el.classList.add('selected');
                lastSelected = el;
                TatuDiff.enableButtons();
            }
        }
        TatuDiff.mirrorSelect(el);
    },
    mirrorSelect: (el) => {
        let parent = el.parentNode,
            parentId = parent.id,
            leftSide = parentId === 'left-side',
            selected = parent.getElementsByClassName('selected'),
            selectedItems = [];

        for (let i = 0; i < selected.length; i++) {
            const item = selected[i];
            const index = [...item.parentElement.children].indexOf(item);
            selectedItems.push(index);
        }

        TatuDiff.updatedSelectedOnSide(selectedItems, leftSide);
    },
    updatedSelectedOnSide: (items, leftSide) => {
        let side = !leftSide ? document.getElementById('left-side') : document.getElementById('right-side'),
            selectedItems = side.getElementsByClassName('selected');

        TatuDiff.clearSelected(selectedItems);
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            side.children[item].classList.add('selected');
        }
    },
    clearSelected: (items) => {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            item.classList.remove('selected');
        }
    },
    selectBlock: (el, lastSelected) => {
        let lines = el.parentNode.getElementsByClassName('line'),
            inSelect = false,
            addEnd = false;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i] === lastSelected) {
                if (inSelect && !addEnd) {
                    addEnd = true;
                }
                
                if (!inSelect) {
                    inSelect = true;
                }
            } else if (lines[i] === el) {
                if (inSelect && !addEnd) {
                    el.classList.add('selected');
                    addEnd = true;
                }
                
                if (!inSelect) {
                    inSelect = true;
                }
            }
            
            if (inSelect && !addEnd) {
                lines[i].classList.add('selected');
            }
        }
    },
    inBlockSelect: () => {
        selectedLines = document.getElementsByClassName('selected');
        if (selectedLines.length > 1) {
            return true;
        }
        return false;
    },
    removeOtherSelected: () => {
        let lines = document.getElementsByClassName('line');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].classList.contains('selected')) {
                lines[i].classList.remove('selected');
            }
        }
    },
    copySelected: () => {
        let result = '',
            selectedLines = document.getElementsByClassName('selected'),
            addEOL = selectedLines.length - 1;
            
        for (let i = 0; i < selectedLines.length; i++) {
            let leftResult = selectedLines[i].children[1];
            
            result = result + leftResult.dataset.text;
            if (addEOL > 0) {
                result = result + TatuDiff.getEOL(EOL);
                addEOL--;
            }
        }
        clipboard.set(result);
    },
    mergeLines: (selectedLines) => {
        let mergeTimeString = TatuDiff.getTimeString();
        let rightSide = document.getElementById('right-side');
        for (let i = 0; i < selectedLines.length; i++) {
            let selectedLine = selectedLines[i],
                index = [...selectedLine.parentElement.children].indexOf(selectedLine),
                line = selectedLine.children[1],
                replaceWith = line.innerHTML,
                replaceWithText = line.dataset.text,
                emptyLine = line.classList.contains('empty');

            rightSide.children[index].children[1].innerHTML = replaceWith;
            rightSide.children[index].children[1].dataset.text = replaceWithText;
            rightSide.children[index].classList.add('merged');

                
            History.push({line: index, action: 'merge', time: mergeTimeString});
            selectedLine.classList.add('merged');
            
            if (emptyLine) {
                selectedLine.classList.add('empty');
                rightSide.children[index].classList.add('empty');
            }
            
            mergeResult[index] = leftLines[index];
        }
        TatuDiff.toggleHistoryBtn();
        TatuDiff.disableButtons();
    },
    deleteLines: (selectedLines) => {
        let deleteTimeString = TatuDiff.getTimeString();
        for (let i = 0; i < selectedLines.length; i++) {
            let selectedLine = selectedLines[i],
                index = [...selectedLine.parentElement.children].indexOf(selectedLine);
                
            History.push({line: index, action: 'remove', time: deleteTimeString});
            
            selectedLine.classList.add('empty');
            
            mergeResult[index] = '@empty@';
        }
        TatuDiff.toggleHistoryBtn();
        TatuDiff.disableButtons();
    },
    mergeSelected: () => {
        let leftSide = document.getElementById('left-side');
        selectedLines = leftSide.getElementsByClassName('selected');
        if (selectedLines.length > 0) {
            TatuDiff.mergeLines(selectedLines);
        }
    },
    deleteSelected: () => {
        selectedLines = document.getElementsByClassName('selected');
        if (selectedLines.length > 0) {
            TatuDiff.deleteLines(selectedLines);
        }
    },
    getResult: () => {
        let result = '';
        for (let i = 0; i < mergeResult.length; i++) {
            if (mergeResult[i] !== '@empty@') {
                result = result + mergeResult[i];
                if (i !== (mergeResult.length - 1)) {
                    result = result + TatuDiff.getEOL(EOL);
                }
            }
        }
        return result;
    },
    copyResult: () => {
        let result = TatuDiff.getResult();
        vscode.postMessage({
            command: 'copy_result',
            text: result
        });
    },
    saveResult: () => {
        let result = TatuDiff.getResult();
        vscode.postMessage({
            command: 'save_result',
            text: result
        });
    },
    closeWindow: () => {
        vscode.postMessage({
            command: 'close_window'
        });
    },
    openInfoWindow: () => {
        let infoWindow = document.getElementById('info_window');
        if (infoWindow.classList.contains('open')) {
            infoWindow.classList.remove('open');
        } else {
            infoWindow.classList.add('open');
        }
    },
    closeInfoWindow: () => {
        let infoWindow = document.getElementById('info_window');
        infoWindow.classList.remove('open');
    },
    historyBack: () => {
        if (History.length === 0) {
            return false;
        }
        let backStep = History.pop(),
            index = parseInt(backStep.line),
            time  = backStep.time,
            leftSide = document.getElementById('left-side');

        let trs = leftSide.children;
        for (let i = 0; i < trs.length; i++) {
            let rowIndex = [...trs[i].parentElement.children].indexOf(trs[i]);
            if (rowIndex === index) {
                switch(backStep.action) {
                    case 'merge':
                        TatuDiff.handleBackWardsMerge(trs[i], index);
                        mergeResult[index] = rightLines[index];
                        break;
                    case 'remove':
                        trs[i].classList.remove('empty');
                        TatuDiff.handleBackWordsRemove(index);
                        mergeResult[index] = rightLines[index];
                        break;
                    case 'edit':
                        TatuDiff.handleBackWardsEdit(trs[i], index, backStep);
                        break;
                }
            }
        }

        if (History.length > 0 && History[History.length - 1].time === time) {
            TatuDiff.historyBack();
            return;
        }
        TatuDiff.scrollToRow(index);
        TatuDiff.toggleHistoryBtn();
    },
    handleBackWordsRemove(index) {
        rightSide = document.getElementById('right-side');
        rightSide.children[index].classList.remove('empty');
    },
    handleBackWardsEdit(row, index, backStep) {
        let rightSide = document.getElementById('right-side'),
            line = rightSide.children[index].children[1],
            language = line.dataset.lang,
            text = backStep.oldval;

        if (useHighlight) {
            text = hljs.highlight(text, {language: language}).value;
        }

        line.innerHTML = text;
        line.dataset.text = backStep.oldval;
        mergeResult[index] = backStep.oldval;
    },
    handleBackWardsMerge: (row, index) => {
        let rightSide = document.getElementById('right-side'),
            line = rightSide.children[index].children[1],
            rightContent = rightLines[index].replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0"),
            empty = false;

            row.classList.remove('empty');
            rightSide.children[index].classList.remove('empty');

            if (rightContent === '@empty@') {
                rightContent = '';
                empty = true;
            } 

            line.dataset.text = rightContent;

            if (useHighlight && !empty) {
                rightContent = hljs.highlight(rightContent, {language: line.dataset.lang}).value;
            }
            line.innerHTML = rightContent;
            rightSide.children[index].classList.remove('merged');
            row.classList.remove('merged');

            mergeResult[index] = rightLines[index];

        // row.classList.remove('merged');

        // for (let e = 0; e < cells.length; e++) {
        //     if (cells[e].nodeName === 'TD') {
        //         if (last) {
        //             if (rightLines[index] === '@empty@') {
        //                 cells[e].innerHTML = '';
        //             } else {
                        
        //                 cells[e].dataset.text = rightContent;
        //                 if (useHighlight) {
        //                     rightContent = hljs.highlight(rightContent, {language: cells[e].dataset.lang}).value;
        //                 }
        //                 cells[e].innerHTML = rightContent;
        //                 row.classList.remove('empty');

        //             }
        //             mergeResult[index] = rightLines[index];
        //         }
        //         last = true;
        //     }
        // }
    },
    getRow: (el) => {
        let currEl = el;

        if (currEl.classList.contains('line')) {
            return currEl;
        }

        while (!currEl.classList.contains('line')) {
            currEl = currEl.parentNode;
        }

        return currEl;
    },
    getTimeString: () => {
        let date = new Date();
        return date.getDay().toString() + date.getHours().toString() + date.getMinutes().toString() + date.getSeconds().toString() + date.getMilliseconds().toString();
    },
    enableButtons: () => {
        let mergeLines = document.getElementById('merge_lines'),
            deleteLines = document.getElementById('delete_lines');
        
        mergeLines.disabled = false;
        deleteLines.disabled = false;
    },
    disableButtons: () => {
        let mergeLines = document.getElementById('merge_lines'),
            deleteLines = document.getElementById('delete_lines');
        
        mergeLines.disabled = true;
        deleteLines.disabled = true;
    },
    toggleHistoryBtn: () => {
        let undoBtn = document.getElementById('undo');

        if (History.length > 0 && undoBtn.disabled) {
            undoBtn.disabled = false;
        } else if(History.length === 0) {
            undoBtn.disabled = true;
        }
    },
    keyDownHandler: (event) => {
        // Copy shortcut
        if (event.keyCode === 67 && event.ctrlKey || event.keyCode === 67 && event.metaKey) {
            event.preventDefault();
            TatuDiff.copySelected();
        }

        // save action (ctrl + s)
        if ((event.ctrlKey || event.metaKey) && event.keyCode === 83 && !inEdit) {
            event.preventDefault();
            TatuDiff.saveResult();
        }

        // down key
        if (event.keyCode === 40 && !event.shiftKey) {
            event.preventDefault();
            TatuDiff.scrollToNext();
        }

        // up key
        if (event.keyCode === 38 && !event.shiftKey) {
            event.preventDefault();
            TatuDiff.scrollToPrev();
        }

         // right key
         if (event.keyCode === 39 && !event.shiftKey && !inEdit) {
            event.preventDefault();
            TatuDiff.mergeSelected();
        }

        // Backspace
        if (event.keyCode === 8 && !event.shiftKey && !inEdit) {
            event.preventDefault();
            TatuDiff.deleteSelected();
        }

        // Esc
        if (event.keyCode === 27 && !event.shiftKey) {
            event.preventDefault();
            TatuDiff.closeWindow();
        }
        
        // Ctrl + z
        if (event.keyCode === 90 && (event.ctrlKey || event.metaKey) && !inEdit) {
        	event.preventDefault();
        	TatuDiff.historyBack();
        }

        if (event.keyCode === 13 && inEdit) {
            event.preventDefault();
            TatuDiff.saveEditableOnKeypress();
        }
    },
    scrollMoveRight: (e) => {
        let rightSide = document.getElementById('right-side');
        const dx = e.clientX - rightPos.x;
        const dy = e.clientY - rightPos.y;
    
        // Scroll the element
        rightSide.scrollTop = rightPos.top - dy;
        rightSide.scrollLeft = rightPos.left - dx;
    },
    enableScrollMoveRight: (e) => {
        let rightSide = document.getElementById('right-side');
        rightSide.addEventListener('mousemove', TatuDiff.scrollMoveRight);
        rightPos = {
            // The current scroll
            left: rightSide.scrollLeft,
            top: rightSide.scrollTop,
            // Get the current mouse position
            x: e.clientX,
            y: e.clientY,
        };
    },
    disableScrollMoveRight: () => {
        let rightSide = document.getElementById('right-side');
        rightSide.removeEventListener('mousemove', TatuDiff.scrollMoveRight);
    },
    scrollMoveLeft: (e) => {
        let leftSide = document.getElementById('left-side');
        const dx = e.clientX - rightPos.x;
        const dy = e.clientY - rightPos.y;
    
        // Scroll the element
        leftSide.scrollTop = rightPos.top - dy;
        leftSide.scrollLeft = rightPos.left - dx;
    },
    enableScrollMoveLeft: (e) => {
        let leftSide = document.getElementById('left-side');
        leftSide.addEventListener('mousemove', TatuDiff.scrollMoveLeft);
        rightPos = {
            // The current scroll
            left: leftSide.scrollLeft,
            top: leftSide.scrollTop,
            // Get the current mouse position
            x: e.clientX,
            y: e.clientY,
        };
    },
    disableScrollMoveLeft: () => {
        let leftSide = document.getElementById('left-side');
        leftSide.removeEventListener('mousemove', TatuDiff.scrollMoveLeft);
    },
    clearExistingListeners: () => {
        TatuDiff.disableScrollMoveLeft();
        TatuDiff.disableScrollMoveRight();
    },
    makeSidesEqualWidth: () => {
        let rightSide = document.getElementById('right-side'),
            leftSide = document.getElementById('left-side'),
            width = 0;

        if (rightSide.scrollWidth > width) {
            width = rightSide.scrollWidth;
        }

        if (leftSide.scrollWidth > width) {
            width = leftSide.scrollWidth;
        }

        rightSide.firstChild.style.width = width + 'px';
        leftSide.firstChild.style.width = width + 'px';
    },
    updateOtherSideScrollPosition: (e) => {
        let panel = e.target,
            panelId = panel.id,
            otherPanel = panelId === 'left-side' ? document.getElementById('right-side') : document.getElementById('left-side');
        otherPanel.scrollLeft = panel.scrollLeft;
    },
    setButtonListners: () => {
        let scrollToPrev = document.getElementById('scroll_to_prev'),
            scrollToNext = document.getElementById('scroll_to_next'),
            mergeLines = document.getElementById('merge_lines'),
            deleteLines = document.getElementById('delete_lines'),
            undo = document.getElementById('undo'),
            copyResult = document.getElementById('copy_result'),
            saveResult = document.getElementById('save_result'),
            info = document.getElementById('info'),
            closeInfo = document.getElementById('close_info'),
            closeWindow = document.getElementById('close_window'),
            rightSide = document.getElementById('right-side'),
            leftSide = document.getElementById('left-side');

        scrollToPrev.addEventListener('click', TatuDiff.scrollToPrev);
        scrollToNext.addEventListener('click', TatuDiff.scrollToNext);
        mergeLines.addEventListener('click', TatuDiff.mergeSelected);
        deleteLines.addEventListener('click', TatuDiff.deleteSelected);
        undo.addEventListener('click', TatuDiff.historyBack);
        copyResult.addEventListener('click', TatuDiff.copyResult);
        saveResult.addEventListener('click', TatuDiff.saveResult);
        info.addEventListener('click', TatuDiff.openInfoWindow);
        closeInfo.addEventListener('click', TatuDiff.closeInfoWindow);
        closeWindow.addEventListener('click', TatuDiff.closeWindow);
        rightSide.addEventListener('mousedown', TatuDiff.enableScrollMoveRight);
        rightSide.addEventListener('scroll', TatuDiff.updateOtherSideScrollPosition);
        leftSide.addEventListener('mousedown', TatuDiff.enableScrollMoveLeft);
        leftSide.addEventListener('scroll', TatuDiff.updateOtherSideScrollPosition);
        window.addEventListener('mouseup', TatuDiff.clearExistingListeners);
    }
};

window.addEventListener('keydown', (event) => {
    TatuDiff.keyDownHandler(event);
});