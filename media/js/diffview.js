/*
This is part of jsdifflib v1.0. <http://github.com/cemerick/jsdifflib>

Copyright 2007 - 2011 Chas Emerick <cemerick@snowtide.com>. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are
permitted provided that the following conditions are met:

   1. Redistributions of source code must retain the above copyright notice, this list of
      conditions and the following disclaimer.

   2. Redistributions in binary form must reproduce the above copyright notice, this list
      of conditions and the following disclaimer in the documentation and/or other materials
      provided with the distribution.

THIS SOFTWARE IS PROVIDED BY Chas Emerick ``AS IS'' AND ANY EXPRESS OR IMPLIED
WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Chas Emerick OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

The views and conclusions contained in the software and documentation are those of the
authors and should not be interpreted as representing official policies, either expressed
or implied, of Chas Emerick.
*/
let dmp = new diff_match_patch();
diffview = {
	/**
	 * Builds and returns a visual diff view.  The single parameter, `params', should contain
	 * the following values:
	 *
	 * - baseTextLines: the array of strings that was used as the base text input to SequenceMatcher
	 * - newTextLines: the array of strings that was used as the new text input to SequenceMatcher
	 * - opcodes: the array of arrays returned by SequenceMatcher.get_opcodes()
	 * - baseTextName: the title to be displayed above the base text listing in the diff view; defaults
	 *	   to "Base Text"
	 * - newTextName: the title to be displayed above the new text listing in the diff view; defaults
	 *	   to "New Text"
	 * - contextSize: the number of lines of context to show around differences; by default, all lines
	 *	   are shown
	 * - viewType: if 0, a side-by-side diff view is generated (default); if 1, an inline diff view is
	 *	   generated
	 */
	buildView:  (params) => {
		let baseTextLines = params.baseTextLines,
			newTextLines = params.newTextLines,
			opcodes = params.opcodes,
			highlight = params.highlight,
			baseTextName = params.baseTextName ? params.baseTextName : "Base Text",
			newTextName = params.newTextName ? params.newTextName : "New Text",
			contextSize = params.contextSize,
			inline = (params.viewType == 0 || params.viewType == 1) ? params.viewType : 0,
			inserted = 0,
			deleted = 0,
			changed = 0,
			inSublang = false,
			language = params.language,
			usesSubLang = params.usesSubLang,
			insertC = document.getElementById('insertCount'),
			deletedC = document.getElementById('deletedCount'),
			changedC = document.getElementById('changedCount');

		if (baseTextLines == null)
			throw "Cannot build diff view; baseTextLines is not defined.";
		if (newTextLines == null)
			throw "Cannot build diff view; newTextLines is not defined.";
		if (!opcodes)
			throw "Cannot build diff view; opcodes is not defined.";
		
		let celt = (name, clazz, id = false) => {
			let e = document.createElement(name);
			e.className = clazz;
			if (id) {
				e.id = id;
			}
			return e;
		}
		
		let telt = (name, text) => {
			let e = document.createElement(name);
			e.appendChild(document.createTextNode(text));
			return e;
		}
		
		let ctelt = (name, clazz, text, cleanText = '') => {
			let e = document.createElement(name);
			e.className = clazz;
			// Highlight here
			if (highlight) {
				text = hljs.highlight(text, {language: language}).value;
			}
			e.dataset.text = cleanText;
			if (highlight) {
				e.innerHTML = text;
			} else {
				e.appendChild(document.createTextNode(text));
			}
			return e;
		}

		let btelt = (name, clazz, text, cleanText = '') => {
			let e = document.createElement(name);
			e.className = clazz;
			// Highlight here
			if (highlight) {
				if (usesSubLang) {
					// Test for start end end sublanguages to change lang

				}
				text = hljs.highlight(text, {language: language}).value;
				text = text.replace(/TATTUDIFFINSSTART/gm, '<span class="ins">')
				.replace(/(TATTUDIFFINSEND|TATTUDIFFDELLEND)/gm, '</span>')
				.replace(/TATTUDIFFDELLSTART/gm, '<span class="dell">');
			}
			e.dataset.text = cleanText;
			e.innerHTML = text;
			return e;
		}

	
		let tdata = document.createElement("thead"),
			node = document.createElement("tr");
		tdata.appendChild(node);
		if (inline) {
			node.appendChild(document.createElement("th"));
			node.appendChild(document.createElement("th"));
			node.appendChild(ctelt("th", "texttitle", baseTextName + " vs. " + newTextName));
		} else {
			node.appendChild(document.createElement("th"));
			node.appendChild(ctelt("th", "texttitle", newTextName));
			node.appendChild(document.createElement("th"));
			node.appendChild(ctelt("th", "texttitle", baseTextName));
		}
		tdata = [tdata];
		
		let rows = [],
			node2;
		
		/**
		 * Adds two cells to the given row; if the given row corresponds to a real
		 * line number (based on the line index tidx and the endpoint of the 
		 * range in question tend), then the cells will contain the line number
		 * and the line of text from textLines at position tidx (with the class of
		 * the second cell set to the name of the change represented), and tidx + 1 will
		 * be returned.	 Otherwise, tidx is returned, and two empty cells are added
		 * to the given row.
		 */
		let addCells = (row, tidx, tend, textLines, change) => {
			if (tidx < tend) {
				row.appendChild(telt("th", (tidx + 1).toString()));
				row.appendChild(ctelt("td", change, textLines[tidx].replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0"), textLines[tidx]));
				return tidx + 1;
			} else {
				row.appendChild(document.createElement("th"));
				row.appendChild(celt("td", "empty"));
				return tidx;
			}
		}
		
		let addCellsSpecial = (row, tidx, tend, widx, wend, change, sourceTxt, inlineDiff, last) => {
			if (tidx < tend) {
				if (last) {
					widx--;
				}
				
				let output = '';
				for (let e = 0; e < inlineDiff.length; e++) {
					let currDiff = inlineDiff[e];
					switch (currDiff[0]) {
						case 0: // equal
							output = output + currDiff[1];
							break;
						case 1: // inserted
							if (!last) {
								output = output + 'TATTUDIFFINSSTART' + currDiff[1] + 'TATTUDIFFINSEND';
							}
							break;
						case -1: // deleted
							if (last) {
								output = output + 'TATTUDIFFDELLSTART' + currDiff[1] + 'TATTUDIFFDELLEND';
							}
							break;
					}
				}
				
				cleanText = output;
			
				row.appendChild(telt("th", (tidx + 1).toString()));
				row.appendChild(btelt("td", change, cleanText, sourceTxt));
				return tidx + 1;
			} else {
				row.appendChild(document.createElement("th"));
				row.appendChild(celt("td", "empty"));
				return tidx;
			}
		}
		
		let addCellsInline = (row, tidx, tidx2, textLines, change) => {
			row.appendChild(telt("th", tidx == null ? "" : (tidx + 1).toString()));
			row.appendChild(telt("th", tidx2 == null ? "" : (tidx2 + 1).toString()));
			row.appendChild(ctelt("td", change, textLines[tidx != null ? tidx : tidx2].replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0")));
		}
		
		for (let idx = 0; idx < opcodes.length; idx++) {
			code = opcodes[idx];
			change = code[0];
			let b = code[3],
				be = code[4],
				n = code[1],
				ne = code[2],
				rowcnt = Math.max(be - b, ne - n),
				toprows = [],
				botrows = [];
			for (let i = 0; i < rowcnt; i++) {
				// jump ahead if we've alredy provided leading context or if this is the first range
				if (contextSize && opcodes.length > 1 && ((idx > 0 && i == contextSize) || (idx == 0 && i == 0)) && change=="equal") {
					let jump = rowcnt - ((idx == 0 ? 1 : 2) * contextSize);
					if (jump > 1) {
						toprows.push(node = document.createElement("tr"));
						
						b += jump;
						n += jump;
						i += jump - 1;
						node.appendChild(telt("th", "..."));
						if (!inline) node.appendChild(ctelt("td", "skip", ""));
						node.appendChild(telt("th", "..."));
						node.appendChild(ctelt("td", "skip", ""));
						
						// skip last lines if they're all equal
						if (idx + 1 == opcodes.length) {
							break;
						} else {
							continue;
						}
					}
				}
				
				toprows.push(node = document.createElement("tr"));
				if (inline) {
					if (change == "insert") {
						addCellsInline(node, null, n++, newTextLines, change);
					} else if (change == "replace") {
						botrows.push(node2 = document.createElement("tr"));
						if (b < be) addCellsInline(node, b++, null, baseTextLines, "delete");
						if (n < ne) addCellsInline(node2, null, n++, newTextLines, "insert");
					} else if (change == "delete") {
						addCellsInline(node, b++, null, baseTextLines, change);
					} else {
						// equal
						addCellsInline(node, b++, n++, baseTextLines, change);
					}
				} else {
					// changes
					switch (change) {
						case 'insert':
							inserted++;
							node.classList.add('difference');
							break;
						case 'replace':
							if (b < be && n < ne) {
								changed++;
							} else {
								inserted++;
							}
							node.classList.add('difference');
							break;
						case 'delete':
							deleted++;
							node.classList.add('difference');
							break;
					}
					if (change == "replace") {
						if (b < be && n < ne) { // first coll
							// var cleanText = newTextLines[b].replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0").replace(/</g, '&lt;').replace(/>/g, '&gt;');
							let cleanText = newTextLines[b].replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0"),
							// var diffText = baseTextLines[n].replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0").replace(/</g, '&lt;').replace(/>/g, '&gt;');
								diffText = baseTextLines[n].replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0"),
								inlineDiff = dmp.diff_main(diffText, cleanText);
								dmp.diff_cleanupSemantic(inlineDiff);
							
							if (b < be) {
								leftLines.push(newTextLines[b]);
							} else {
								leftLines.push('@empty@');
							}
							
							if (n < ne) {
								rightLines.push(baseTextLines[n]);
							} else {
								rightLines.push('@empty@');
							}
							
							b = addCellsSpecial(node, b, be, n, ne, change, newTextLines[b], inlineDiff, false);
							n = addCellsSpecial(node, n, ne, b, be, change, baseTextLines[n], inlineDiff, true);
						} else {
							if (b < be) {
								leftLines.push(newTextLines[b]);
							} else {
								leftLines.push('@empty@');
							}
							
							if (n < ne) {
								rightLines.push(baseTextLines[n]);
							} else {
								rightLines.push('@empty@');
							}
							b = addCells(node, b, be, newTextLines, "insert");
							n = addCells(node, n, ne, baseTextLines, change);
						}
						
					} else {
						if (b < be) {
							leftLines.push(newTextLines[b]);
						} else {
							leftLines.push('@empty@');
						}
						
						if (n < ne) {
							rightLines.push(baseTextLines[n]);
						} else {
							rightLines.push('@empty@');
						}
						b = addCells(node, b, be, newTextLines, change);
						n = addCells(node, n, ne, baseTextLines, change);
					}
				}
			}

			for (let i = 0; i < toprows.length; i++) rows.push(toprows[i]);
			for (let i = 0; i < botrows.length; i++) rows.push(botrows[i]);
		}

		
		mergeResult = [...rightLines];
		
		insertC.innerHTML = inserted;
		changedC.innerHTML = changed;
		deletedC.innerHTML = deleted;
		
		if (inserted === 0 && changed === 0 && deleted === 0) {
			window.NO_CHANGES = true;
		}
		
		tdata.push(node = document.createElement("tbody"));
		for (let idx in rows) rows.hasOwnProperty(idx) && node.appendChild(rows[idx]);
		
		node = celt("table", "diff" + (inline ? " inlinediff" : ""), "diff");
		for (let idx in tdata) tdata.hasOwnProperty(idx) && node.appendChild(tdata[idx]);

		return node;
	}
};

