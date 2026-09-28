// N+ 品牌「＋」：金色十字加星（對應公司標誌）。文字「+」以視覺隱藏方式保留給搜尋引擎與螢幕閱讀器。
export function NPlus() {
  return (
    <span className="nplus" style={{position:"relative",display:"inline-block",width:".92em",height:".92em",verticalAlign:"-.1em",margin:"0 .05em"}}><span style={{position:"absolute",width:1,height:1,overflow:"hidden",clip:"rect(0 0 0 0)",whiteSpace:"nowrap"}}>+</span><svg viewBox="0 0 140 140" width="100%" height="100%" aria-hidden="true" focusable="false" style={{display:"block"}}><g stroke="#c8a97e" strokeWidth="13" strokeLinecap="round"><line x1="70" y1="8" x2="70" y2="132"/><line x1="8" y1="70" x2="132" y2="70"/></g><circle cx="70" cy="70" r="22" fill="#c8a97e" opacity=".15"/><polygon fill="#c8a97e" points="70.0,26.0 79.9,56.4 111.8,56.4 86.0,75.2 95.9,105.6 70.0,86.8 44.1,105.6 54.0,75.2 28.2,56.4 60.1,56.4"/></svg></span>
  );
}
