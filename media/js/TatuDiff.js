let inEdit = false;
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
        let diffWindow = document.getElementById('diffWindow'),
            diffrences = diffWindow.getElementsByClassName('difference');

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
        let diffWindow = document.getElementById('diffWindow'),
            diffrences = diffWindow.getElementsByClassName('difference');

        if (diffrences.length === 0) {
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
        let trs = document.getElementsByTagName('tr');
        smoothScroll(trs[index - 1]);
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
        let rightSide = el.children[3];
        if (rightSide.contentEditable === 'true') {
            rightSide.contentEditable = 'false';
            inEdit = false;
        } else {
            rightSide.contentEditable = 'true';
            rightSide.addEventListener('focusout', (e) => {
                TatuDiff.saveEditable(e.target);
            });
            rightSide.focus();
            inEdit = true;
        }
    },
    saveEditable: (el) => {
        let saveTimeString = TatuDiff.getTimeString(),
            newVal = el.textContent,
            oldVal = el.dataset.text,
            index = (el.parentNode.rowIndex - 1),
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
        let tds = document.getElementsByTagName('td');
        for (let i = 0; i < tds.length; i++) {
            const el = tds[i];

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
            trs = table.getElementsByTagName('tr');
        for (let i = 0; i < trs.length; i++) {
            trs[i].onclick  = (e) => {
                if (!inEdit) {
                    e.preventDefault();
                    let target = TatuDiff.getRow(e.target);
                    TatuDiff.setSelect(target, e.shiftKey);
                }
            };
            trs[i].ondblclick = (e) => {
                e.preventDefault();
                if (!inEdit) {
                    let target = TatuDiff.getRow(e.target);
                    TatuDiff.toggleEditable(target);
                }
            };
            trs[i].oninput = (e) => {
                if (useHighlight) {
                    TatuDiff.refreshHighLight(e);
                }
            };
            trs[i].onanimationend = (e) => {
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
    },
    selectBlock: (el, lastSelected) => {
        let trs = document.getElementsByTagName('tr'),
            inSelect = false,
            addEnd = false;
        for (let i = 0; i < trs.length; i++) {
            if (trs[i] === lastSelected) {
                if (inSelect && !addEnd) {
                    addEnd = true;
                }
                
                if (!inSelect) {
                    inSelect = true;
                }
            } else if (trs[i] === el) {
                if (inSelect && !addEnd) {
                    el.classList.add('selected');
                    addEnd = true;
                }
                
                if (!inSelect) {
                    inSelect = true;
                }
            }
            
            if (inSelect && !addEnd) {
                trs[i].classList.add('selected');
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
        let trs = document.getElementsByTagName('tr');
        for (let i = 0; i < trs.length; i++) {
            if (trs[i].classList.contains('selected')) {
                trs[i].classList.remove('selected');
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
        for (let i = 0; i < selectedLines.length; i++) {
            let selectedLine = selectedLines[i],
                index = (selectedLine.rowIndex - 1),
                replaceWith = '',
                replaceWithText = '',
                children = selectedLine.children,
                emptyLine = false;
                
            History.push({line: index, action: 'merge', time: mergeTimeString});
            selectedLine.classList.add('merged');
            let last = false;
            for (let e = 0; e < children.length; e++) {
                if (children[e].nodeName === 'TD') {
                    if (!last) {
                        replaceWith = children[e].innerHTML;
                        replaceWithText = children[e].dataset.text;
                        if (children[e].classList.contains('empty')) {
                            emptyLine = true;
                        }
                    } else {
                        children[e].innerHTML = replaceWith;
                        children[e].dataset.text = replaceWithText;
                    }
                    last = true;
                }
            }
            
            if (emptyLine) {
                selectedLine.classList.add('empty');
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
                index = (selectedLine.rowIndex - 1);
                
            History.push({line: index, action: 'remove', time: deleteTimeString});
            
            selectedLine.classList.add('empty');
            
            mergeResult[index] = '@empty@';
        }
        TatuDiff.toggleHistoryBtn();
        TatuDiff.disableButtons();
    },
    mergeSelected: () => {
        selectedLines = document.getElementsByClassName('selected');
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
            time  = backStep.time;
        let trs = document.getElementsByTagName('tr');
        for (let i = 0; i < trs.length; i++) {
            if ((trs[i].rowIndex - 1) === index) {
                switch(backStep.action) {
                    case 'merge':
                        TatuDiff.handleBackWardsMerge(trs[i], index);
                        mergeResult[index] = rightLines[index];
                        break;
                    case 'remove':
                        trs[i].classList.remove('empty');
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
    handleBackWardsEdit(row, index, backStep) {
        let cells = row.children,
            editCell = cells[3],
            language = cells[3].dataset.lang,
            text = backStep.oldval;

        if (useHighlight) {
            text = hljs.highlight(text, {language: language}).value;
        }

        editCell.innerHTML = text;
        editCell.dataset.text = backStep.oldval;
        mergeResult[index] = backStep.oldval;
    },
    handleBackWardsMerge: (row, index) => {
        let cells = row.children,
            last = false;

        row.classList.remove('merged');

        for (let e = 0; e < cells.length; e++) {
            if (cells[e].nodeName === 'TD') {
                if (last) {
                    if (rightLines[index] === '@empty@') {
                        cells[e].innerHTML = '';
                    } else {
                        let rightContent = rightLines[index].replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0");
                        cells[e].dataset.text = rightContent;
                        if (useHighlight) {
                            rightContent = hljs.highlight(rightContent, {language: cells[e].dataset.lang}).value;
                        }
                        cells[e].innerHTML = rightContent;
                        row.classList.remove('empty');

                    }
                    mergeResult[index] = rightLines[index];
                }
                last = true;
            }
        }
    },
    getRow: (el) => {
        let currEl = el;

        if (currEl.nodeName === 'TR') {
            return currEl;
        }

        while (currEl.nodeName !== 'TR') {
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
            closeWindow = document.getElementById('close_window');

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
    }
};

window.addEventListener('keydown', (event) => {
    TatuDiff.keyDownHandler(event);
});