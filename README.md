# tatu-diff-merge

Tatu diff merge is a side by side diff viewer with merge capabilities.  
It allows to quickly merge from the clipboard or against a file and file on disk.

![Preview](images/preview.jpg)

## main features
The main functiona are availible trough the context menu of the current file.  

* diff/merge with clipboard
* diff/merge with file
* diff/merge with file on disk

![Context menu](images/context-menu.jpg)

## Key bindings
When you have the Diff window open, there are some shortcuts you can use.

 * <kbd>&downarrow;</kbd> *Scroll and select next diff*  
 * <kbd>&uparrow;</kbd> *Scroll and select previous diff*
 * <kbd>&rightarrow;</kbd> *Merge selected lines*
 * <kbd>Backspace</kbd> *Delete selected lines*
 * <kbd>Esc</kbd> *Close diff window*
 * <kbd>Shift</kbd> + mouse click *Select multiple lines*  
 * <kbd>Ctrl</kbd> + <kbd>s</kbd> or for mac users <kbd>&#8984;</kbd> + <kbd>s</kbd> *Save result (and close the diff)*
 * <kbd>Ctrl</kbd> + <kbd>c</kbd> or for mac users <kbd>&#8984;</kbd> + <kbd>c</kbd> *Copy selected lines from the left diff*  
 * <kbd>Ctrl</kbd> + <kbd>z</kbd> or for mac users <kbd>&#8984;</kbd> + <kbd>z</kbd> Undo last action
 * Double click right side: Enter edit mode
 * <kbd>Return</kbd> In edit mode, save result

 ## Known issues
 * Syntax highlighting doesn't mach vscode syntax highlighting
 * Can't edit left or right side