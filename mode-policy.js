/* Mode-specific input policy. Pure functions; no independent vehicle state. */
window.MODE_POLICY = {
 version:'dual-mode-v3',
 categories:[
  {id:'C',label:'行程',groups:['C']},{id:'E',label:'媒体',groups:['E']},
  {id:'D',label:'舒适',groups:['D']},{id:'F',label:'个人',groups:['F']},
  {id:'G',label:'车辆',groups:['B','G']},{id:'H',label:'设置',groups:['H']}
 ],
 physicalOnly:['A04','A06','A08','A09','B03','B09','B10','B11','G06','G07'],
 manualTouch:['B12','C04','D04','D05','D06','D09','E03','E04','E07','E08','G04'],
 physicalTasks:['A03','A04','A06','A07','A09','A10','B03','B09','B10','B11','D01','D02','D03','D07','E01','E02','F01','F03','F04','G06','G07','G08','G09','G10'],
 uiMode(state,side='L'){
  if(state.fallback)return 'fallback';
  if(side==='R')return 'passenger';
  if(state.pending==='manual')return 'handover';
  if(state.mode==='manual')return state.gear==='P'&&state.speed===0?'parked':'manual';
  return 'l4';
 },
 label(mode){return {l4:'L4 · 门屏主操作',manual:'人工行驶 · 实体主操作',parked:'人工驻车 · 完整触控可用',handover:'恢复准备 · 系统仍驾驶',passenger:'副驾 · 本座触控',fallback:'系统后备 · 必要操作优先'}[mode]},
 reason(id,state,side,channel='touch',kind='action'){
  if(channel!=='touch')return '';
  if(id==='A08')return '就绪由系统判断；网页仅在外部演示台模拟人员和接口条件。';
  if(id==='G03')return '充电进度自动显示；状态推进在外部演示台。';
  if(this.physicalOnly.includes(id))return '此功能使用固定实体入口；中央继续显示状态。';
  const mode=this.uiMode(state,side);
  if(mode==='fallback'&&!['B12','G04','G08'].includes(id))return '系统正在执行后备，当前操作暂不执行；请求不会排队。';
  if(mode==='handover'&&!['A07','A10','E08'].includes(id))return '正在恢复人工准备：复杂操作暂缓，草稿已保留，系统仍驾驶。';
  if(mode==='manual'&&!this.manualTouch.includes(id))return this.physicalTasks.includes(id)?'人工行驶请使用实体控件；门屏作为辅助。':'人工行驶暂不开放该主驾触控任务，请驻车后继续；副驾可处理其授权任务。';
  if(mode==='manual'&&kind==='text')return '人工行驶不输入或编辑文字；语音入口可唤醒模拟，草稿保留。';
  return '';
 }
};
