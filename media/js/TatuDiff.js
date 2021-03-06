
var TatuDiff = {
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
        let diffWindow = document.getElementById('diffWindow');
        let diffrences = diffWindow.getElementsByClassName('difference');
			
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
        let diffWindow = document.getElementById('diffWindow');
        let diffrences = diffWindow.getElementsByClassName('difference');
        
        TatuDiff.checkIfinBlock(diffrences[currChange], 'up');
        
        for (var i = diffrences.length; i  >= 0; i--) {
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
        var trs = document.getElementsByTagName('tr');
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
    setClickFunctions: () => {
        var table = document.getElementById('diff');
        var trs = table.getElementsByTagName('tr');
        for (var i = 0; i < trs.length; i++) {
            trs[i].onclick  = function(e) {
                e.preventDefault();
                TatuDiff.setSelect(this, e.shiftKey);
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
        var trs = document.getElementsByTagName('tr');
        var inSelect = false;
        var addEnd = false;
        for (var i = 0; i < trs.length; i++) {
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
        var trs = document.getElementsByTagName('tr');
        for (var i = 0; i < trs.length; i++) {
            if (trs[i].classList.contains('selected')) {
                trs[i].classList.remove('selected');
            }
        }
    },
    copySelected: () => {
        var result = '',
            selectedLines = document.getElementsByClassName('selected'),
            addEOL = selectedLines.length - 1;
            
        for (var i = 0; i < selectedLines.length; i++) {
            var leftResult = selectedLines[i].children[1];
            
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
        for (var i = 0; i < selectedLines.length; i++) {
            var selectedLine = selectedLines[i],
                index = (selectedLine.rowIndex - 1),
                replaceWith = '',
                children = selectedLine.children,
                emptyLine = false;
                
            History.push({line: index, action: 'merge', time: mergeTimeString});
            selectedLine.classList.add('merged');
            var last = false;
            for (var e = 0; e < children.length; e++) {
                if (children[e].nodeName === 'TD') {
                    if (!last) {
                        replaceWith = children[e].innerHTML;
                        if (children[e].classList.contains('empty')) {
                            emptyLine = true;
                        }
                    } else {
                        children[e].innerHTML = replaceWith;
                    }
                    last = true;
                }
            }
            
            if (emptyLine) {
                selectedLine.classList.add('empty');
            }
            
            mergeResult[index] = leftLines[index];
        }
        TatuDiff.disableButtons();
    },
    deleteLines: (selectedLines) => {
        let deleteTimeString = TatuDiff.getTimeString();
        for (var i = 0; i < selectedLines.length; i++) {
            var selectedLine = selectedLines[i],
                index = (selectedLine.rowIndex - 1);
                
            History.push({line: index, action: 'remove', time: deleteTimeString});
            
            selectedLine.classList.add('empty');
            
            mergeResult[index] = '@empty@';
        }
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
        var result = '';
        for (var i = 0; i < mergeResult.length; i++) {
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
        var result = TatuDiff.getResult();
        vscode.postMessage({
            command: 'copy_result',
            text: result
        });
    },
    saveResult: () => {
        var result = TatuDiff.getResult();
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
    historyBack: () => {
        if (History.length === 0) {
            return false;
        }
        var backStep = History.pop(),
            index = parseInt(backStep.line),
            time  = backStep.time;
        var trs = document.getElementsByTagName('tr');
        for (var i = 0; i < trs.length; i++) {
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
                }
            }
        }

        if (History.length > 0 && History[History.length - 1].time === time) {
            TatuDiff.historyBack();
            return;
        }
        TatuDiff.scrollToRow(index);
    },
    handleBackWardsMerge: (row, index) => {
        var cells = row.children,
            last = false;

        row.classList.remove('merged');

        for (var e = 0; e < cells.length; e++) {
            if (cells[e].nodeName === 'TD') {
                if (last) {
                    if (rightLines[index] === '@empty@') {
                        cells[e].innerHTML = '';
                    } else {
                        cells[e].innerHTML = rightLines[index].replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0").replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    }
                    mergeResult[index] = rightLines[index];
                }
                last = true;
            }
        }
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
    keyDownHandler: (event) => {
        // Copy shortcut
        if (event.keyCode === 67 && event.ctrlKey || event.keyCode === 67 && event.metaKey) {
            event.preventDefault();
            TatuDiff.copySelected();
        }

        // save action (ctrl + s)
        if ((event.ctrlKey || event.metaKey) && event.keyCode === 83) {
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
         if (event.keyCode === 39 && !event.shiftKey) {
            event.preventDefault();
            TatuDiff.mergeSelected();
        }

        // Backspace
        if (event.keyCode === 8 && !event.shiftKey) {
            event.preventDefault();
            TatuDiff.deleteSelected();
        }

        // Esc
        if (event.keyCode === 27 && !event.shiftKey) {
            event.preventDefault();
            TatuDiff.closeWindow();
        }
        
        // Ctrl + z
        if (event.keyCode === 90 && (event.ctrlKey || event.metaKey)) {
        	event.preventDefault();
        	TatuDiff.historyBack();
        }
    },
    setButtonListners: () => {
        let scrollToPrev = document.getElementById('scroll_to_prev'),
            scrollToNext = document.getElementById('scroll_to_next'),
            mergeLines = document.getElementById('merge_lines'),
            deleteLines = document.getElementById('delete_lines'),
            copyResult = document.getElementById('copy_result'),
            saveResult = document.getElementById('save_result');

        scrollToPrev.addEventListener('click', TatuDiff.scrollToPrev);
        scrollToNext.addEventListener('click', TatuDiff.scrollToNext);
        mergeLines.addEventListener('click', TatuDiff.mergeSelected);
        deleteLines.addEventListener('click', TatuDiff.deleteSelected);
        copyResult.addEventListener('click', TatuDiff.copyResult);
        saveResult.addEventListener('click', TatuDiff.saveResult);
    }
};

window.addEventListener('keydown', function(event) {
    TatuDiff.keyDownHandler(event);
});

// window.addEventListener('load', TatuDiff.setClickFunctions);
// window.addEventListener('load', TatuDiff.setButtonListners);