/* Local concept prototype. No vehicle, network or safety capability is implemented. */
const tasks=window.TASKS;
const names={A:'驾驶权与系统',B:'道路与安全',C:'行程与导航',D:'空调与空气',E:'媒体与通信',F:'个人舒适',G:'车辆与能源',H:'设置与权限'};
const layout=window.DOOR_LAYOUT.tasks;
const physical={A06:'左门常驻召回',B09:'门屏双闪',B10:'门屏前除雾',D01:'左门温度',D02:'左门风量',D03:'左门AUTO',E01:'门屏媒体音量',E02:'门屏媒体静音'};
const initial=()=>({mode:'manual',pending:null,available:true,wheel:'已展开',driverReady:false,phase:'待机',fallback:0,speed:0,gear:'P',lights:'近光',turn:'关闭',soc:78,
 temp:22,fan:3,auto:true,circ:false,defog:false,rearDefog:false,hvac:true,direction:'吹面',rightTemp:23,rightFan:3,independentFan:false,
 volume:35,mute:false,playing:true,track:0,tracks:['山海之间','静谧公路','清晨电台'],output:'共享扬声器',call:'未通话',callOwner:'副驾',navVolume:45,callVolume:50,voice:'待唤醒',voiceInput:'',
 destination:'西岸美术馆',destDraft:'西岸美术馆',nav:true,routePref:'推荐路线',stops:[],stopDraft:'咖啡馆',alt:'沿江路线',detour:false,stopRequest:false,arrival:0,
 personalOwner:'副驾',seat:50,seatHeat:'关闭',reading:false,window:0,shade:false,messageOpen:false,shared:'',sharedBy:'副驾',shareDraft:'滨江公园',activity:'阅读',activityPlaying:false,
 chargeStation:'西岸充电站',chargePlan:false,charging:false,tire:'正常',doorClosed:true,belt:true,wiper:'关闭',washCount:0,hornCount:0,help:'未发起',locked:true,trunk:false,
 account:'访客',paired:false,device:'演示手机',routePermission:'共同确认',mediaPermission:'双方可操作',privacy:false,recording:false,brightness:70,fontSize:'标准',speech:true,update:'有概念版本可查看',notice:'',planned:false});
let activeDoor='L',activeChannel='touch',selected=null,group='',logs=[],changeCount=0;
const modePolicy=window.MODE_POLICY;
let inputEpoch=0,lastModeSignature='',pointerStart=null;
const personalKeys=['output','call','callVolume','voice','voiceInput','seat','seatHeat','reading','window','shade','messageOpen','shareDraft','activity','activityPlaying','account','paired','device','privacy','recording','brightness','fontSize','speech'];
function makeState(){
 const state=initial();state.parkingView=false;state.sharedSource='';state.people={L:{},R:{}};
 for(const key of personalKeys){
  state.people.L[key]=state[key];state.people.R[key]=state[key];delete state[key];
  Object.defineProperty(state,key,{enumerable:true,get(){return this.people[activeDoor][key]},set(value){this.people[activeDoor][key]=value}});
 }
 state.people.L.device='主驾演示手机';state.people.R.device='副驾演示手机';
 for(const key of ['personalOwner','callOwner']){
  delete state[key];Object.defineProperty(state,key,{enumerable:true,get(){return activeDoor==='L'?'主驾':'副驾'}});
 }
 return state;
}
let s=makeState(),doorSelections={L:'A01',R:'D07'};
let doorGroups={L:'C',R:'D'},keyboard={L:null,R:null},eventTask=null;
let zoneTasks={L:{id:'A01',side:'L'},C:{id:'C01',side:'L'},R:{id:'D07',side:'R'}};
let feedback={L:{seq:0,text:'驾驶任务的操作结果显示在这里。'},C:{seq:0,text:'共享任务的操作结果显示在这里。'},R:{seq:0,text:'副驾个人任务的操作结果显示在这里。'}};
function feedbackZone(id,side=activeDoor){
 if(['D07','D08'].includes(id))return 'R';
 if(id[0]==='A'||(id[0]==='B'&&id!=='B12')||['D01','D02','D03','G06','G07','G10'].includes(id))return 'L';
 if(id[0]==='F'||['E06','E07','E08','E09','H01','H02','H04','H05'].includes(id))return side;
 return 'C';
}
function showTask(id,side=activeDoor){if(!layout[id])return;selected=id;zoneTasks[feedbackZone(id,side)]={id,side}}

const actionTasks={
 'fan-inc':'D02','fan-dec':'D02','fan-auto':'D03','temp-inc':'D01','temp-dec':'D01',
 'volume-inc':'E01','volume-dec':'E01','mute':'E02','recall':'A06','hazard':'B09','defog':'B10','circ':'D04',
 'enable-request':'A03','enable-confirm':'A04','manual-request':'A07','manual-confirm':'A09','cancel-manual':'A10',
 'dest-apply':'C01','pref-apply':'C02','stop-add':'C03','stop-clear':'C03','nav-toggle':'C04','detour':'C06','stop-request':'C08',
 'hvac':'D05','direction':'D06','right-fan':'D08','rear-defog':'D09',
 'play':'E03','prev':'E04','next':'E04','track-apply':'E05','output':'E06','call-answer':'E07','call-reject':'E07','call-end':'E07','voice-run':'E08','voice-cancel':'E08',
 'seat':'F01','seat-heat':'F02','reading':'F03','window':'F04','shade':'F04','message':'F05','share':'F06','activity':'F07',
 'charge-plan':'G02','charge-start':'G03','health-query':'G04','lights':'G06','wiper':'G07','wash':'G07','horn':'B11','help':'G08','help-cancel':'G08','lock':'G09','trunk':'G09','park':'G10',
 'voice-wake':'E08','sos-request':'G08','sos-confirm':'G08','sos-cancel':'G08','account':'H01','pair':'H02','permissions':'H03','privacy':'H04','recording':'H04','display':'H05','update':'H06','parking-view':'B12'
};
const fieldTasks={driverReady:'A08',temp:'D01',fan:'D02',rightTemp:'D07',rightFan:'D08',volume:'E01',track:'E05',output:'E06',voiceInput:'E08',navVolume:'E09',callVolume:'E09',destDraft:'C01',routePref:'C02',stopDraft:'C03',alt:'C06',direction:'D06',seat:'F01',seatHeat:'F02',window:'F04',shareDraft:'F06',activity:'F07',chargeStation:'G02',lights:'G06',wiper:'G07',account:'H01',device:'H02',routePermission:'H03',mediaPermission:'H03',brightness:'H05',fontSize:'H05',speech:'H05'};
const canAct=id=>!!layout[id]?.actionDoors.includes(activeDoor);
function denied(id){record(id||'权限','此操作不属于当前门屏，请使用对应座位的入口');return false}
function inDoor(side,fn){const previous=activeDoor;activeDoor=side;try{return fn()}finally{activeDoor=previous}}
function pausePersonal(side){s.people[side].activityPlaying=false;s.people[side].messageOpen=false}
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bool=x=>x?'开启':'关闭';
const role=()=>s.mode==='manual'?'人工驾驶':s.mode==='mrc'?'系统控制 · 最小风险停车':'系统驾驶 · L4概念';
function zone(id){return layout[id]?.doors.includes(activeDoor)?activeDoor:layout[id]?.doors[0]}
const zoneName=z=>({L:'左门主驾触控屏',R:'右门副驾触控屏'}[z]||'中央只读显示');
function actors(t){return layout[t.编号].actionDoors.map(side=>side==='L'?'主驾':'副驾')}
const actorLabel=t=>['A08','G03'].includes(t.编号)?'系统主动显示 · 外部可模拟':modePolicy.physicalOnly.includes(t.编号)?'实体主入口 · 门屏可查':actors(t).length===2?'双方可操作 · 按权限':actors(t).length===1?actors(t)[0]+'为主':'系统主动提示 · 双方可查';
function freqMatch(t,f){const v=t.使用频次;return !f||(f==='high'&&v.includes('高频'))||(f==='low'&&v.includes('低频'))||(f==='event'&&/事件|条件变化/.test(v))||(f==='state'&&/常驻|持续/.test(v))}
function status(msg,id=selected){
 logs.unshift(msg);logs=logs.slice(0,9);changeCount++;
 const task=eventTask||id,area=layout[task]?feedbackZone(task,activeDoor):'C';
 feedback[area]={seq:feedback[area].seq+1,text:msg};
 if(layout[task])showTask(task);
 render();
}
function record(id,msg){status((layout[id]?id+' · ':'')+msg,id)}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function climateLock(){if(s.defog){record('B10','前除雾中：风量、AUTO与循环正由除雾策略控制。本次请求未执行，也不排队。');return true}return false}
function fan(delta){if(climateLock())return;s.fan=clamp(s.fan+delta,0,7);s.auto=false;record('D02',`主驾手动风量 ${s.fan} 档（示意范围）`)}
function autoFan(){if(climateLock())return;s.auto=true;record('D03','已恢复自动风量；目标温度和循环选择保持不变')}
function temp(delta){s.temp=clamp(s.temp+delta,16,30);record('D01',`主驾目标温度 ${s.temp}°C（示意范围）`)}
function volume(delta){s.volume=clamp(s.volume+delta,0,100);record('E01',`媒体目标音量 ${s.volume}${s.mute?'，媒体仍保持静音':''}；导航、通话、告警未改变`)}
function mute(){s.mute=!s.mute;record('E02',s.mute?'媒体已静音；导航、通话及安全告警不受影响':`媒体已恢复，目标音量 ${s.volume}`)}
function recall(){if(s.wheel==='已展开'){record('A06','方向盘已经展开；不重启机构，也不切换驾驶权');return}s.wheel='已展开';record('A06','模拟方向盘已回位；仍由系统驾驶，尚未交接驾驶权')}
function resetVisuals(){$('panorama').style.filter='';$('panorama').classList.remove('large-text')}
function scene(name){s=makeState();activeDoor='L';activeChannel='simulation';selected=null;eventTask=null;inputEpoch++;doorGroups={L:'C',R:'D'};keyboard={L:null,R:null};logs=[];feedback={L:{seq:0,text:'驾驶任务的操作结果显示在这里。'},C:{seq:0,text:'共享任务的操作结果显示在这里。'},R:{seq:0,text:'副驾个人任务的操作结果显示在这里。'}};zoneTasks={L:{id:'A01',side:'L'},C:{id:'C01',side:'L'},R:{id:'D07',side:'R'}};doorSelections={L:'A01',R:'D07'};if(name==='manual'){s.gear='D';s.speed=30;s.phase='人工驾驶中'}resetVisuals();if(name==='l4'||name==='planned'||name==='fault'||name==='handover'){s.mode='l4';s.gear='D';s.speed=45;s.wheel='已收纳';s.phase='系统驾驶中';doorSelections.L='C01'}if(name==='handover'){s.pending='manual';s.phase='等待回位与人员就绪'}if(name==='planned'){s.planned=true;s.available=false;s.notice='运行范围即将结束，系统将安排后备；你可以自愿恢复人工驾驶。'}if(name==='fault'){s.available=false;s.fallback=1;s.phase='后备执行中';s.notice='自动驾驶发生模拟异常，系统正在减速，不等待乘员接管。'}if(name==='parking'){s.gear='R';s.speed=0;s.parkingView=true;showTask('B12')}document.querySelectorAll('[data-scene]').forEach(b=>b.classList.toggle('active',b.dataset.scene===name));record('演示台',`已载入${{manual:'人工行驶',parked:'人工驻车',handover:'恢复准备',l4:'L4运行',planned:'计划退出',fault:'系统异常',parking:'倒车泊车'}[name]}场景`)}

function act(action){
 const task=actionTasks[action];if(!task||!canAct(task))return denied(task);
 eventTask=task;showTask(task);
 const restriction=modePolicy.reason(task,s,activeDoor,activeChannel);
 if(restriction){record(task,restriction);return}
 if(action==='voice-wake'){s.voice='语音入口已唤醒（本地模拟，无麦克风），文字演示请在L4或驻车使用';record(task,s.voice);return}
 if(action==='sos-request'){s.sosPending=true;record(task,'SOS防误触准备已打开，请再次确认；尚未发起求助');return}
 if(action==='sos-cancel'){s.sosPending=false;record(task,'SOS准备已取消，未联系任何服务');return}
 if(action==='sos-confirm'){if(!s.sosPending){record(task,'请先打开SOS准备，再独立确认');return}s.sosPending=false;s.help='紧急求助模拟连接中';record(task,'SOS已模拟受理，没有拨打真实电话');return}
 if(action==='health-query'){record('G04','车辆健康状态：'+s.tire+'（模拟），请查看中央共享区');return}
 if(action==='parking-view'){s.parkingView=!s.parkingView;record(task,s.parkingView?'中央共享区已展开周边影像示意':'中央共享区已收起周边影像示意');return}
 if(action==='voice-run'&&/回位|召回/.test(s.voiceInput)&&activeDoor!=='L'){s.voice='未执行：方向盘回位仅允许主驾发起';record(task,s.voice);return}
 switch(action){
case'fan-inc':fan(1);return;case'fan-dec':fan(-1);return;case'fan-auto':autoFan();return;case'temp-inc':temp(.5);return;case'temp-dec':temp(-.5);return;case'volume-inc':volume(1);return;case'volume-dec':volume(-1);return;case'mute':mute();return;
case'recall':recall();return;
case'hazard':s.hazard=!s.hazard;record('B09',`双闪${bool(s.hazard)}；不改变驾驶权`);return;
case'defog':s.defog=!s.defog;record('B10',s.defog?'前除雾已开启：风量、AUTO和循环由策略接管':'前除雾已退出；可以重新调整风量、AUTO和循环');return;
case'circ':if(climateLock())return;s.circ=!s.circ;record('D04',s.circ?'已切换为内循环':'已切换为外循环');return;
case'enable-request':if(s.mode!=='manual'){record('A03','系统已在驾驶，无需重复请求');return}if(!s.available){record('A03','当前不满足L4可用条件，仍由人驾驶');return}s.pending='enable';s.phase='等待系统驾驶确认';record('A03','请求已接受，尚未交权；请查看A04并确认');return;
case'enable-confirm':if(s.pending!=='enable'||!s.available){record('A04','请先提出启用请求，并确保条件可用');return}s.mode='l4';s.pending=null;s.wheel='已收纳';s.phase='系统驾驶中';s.driverReady=false;record('A04','演示确认完成：系统先承担驾驶，再模拟收纳方向盘');return;
case'manual-request':if(s.mode==='manual'){record('A07','当前已经是人工驾驶');return}if(s.fallback){record('A07','系统正在后备处置；本演示先完成停车，不进行行驶中的交权');return}s.pending='manual';s.phase='等待回位与人员就绪';s.driverReady=false;pausePersonal('L');record('A07','已收到恢复意愿，乘员活动暂停；仍由系统控制。请回位并确认人员就绪');return;
case'manual-confirm':if(s.pending!=='manual'||s.wheel!=='已展开'||!s.driverReady||s.fallback){record('A09','不能交权：须有恢复请求、方向盘展开和人员就绪；系统保持控制');return}s.mode='manual';s.pending=null;s.phase='人工驾驶';pausePersonal('L');record('A09','演示交权完成：现在由人驾驶；实际确认方式仍待人机验证');return;
case'cancel-manual':if(s.pending!=='manual'){record('A10','当前没有待取消的人工恢复请求');return}s.pending=null;s.driverReady=false;s.phase='系统驾驶中';record('A10','已取消待完成的恢复请求；系统继续驾驶');return;
case'dest-apply':if(!s.destDraft.trim()){record('C01','请输入目的地，未改变行程');return}s.destination=s.destDraft.trim();s.nav=true;s.arrival=0;record('C01',`已选择 ${s.destination}；驾驶权未改变`);return;
case'pref-apply':record('C02',`路线偏好更新为“${s.routePref}”；只是行程偏好，不指挥战术驾驶`);return;
case'stop-add':if(!s.stopDraft.trim()){record('C03','经停点不能为空');return}s.stops.push(s.stopDraft.trim());record('C03',`已添加经停 ${s.stopDraft}；中央行程显示已更新`);return;
case'stop-clear':s.stops=[];record('C03','已清空经停点');return;
case'nav-toggle':s.nav=!s.nav;record('C04',s.nav?'导航已开始；不改变驾驶模式':'导航已结束；L4驾驶权不因此退出');return;
case'detour':s.detour=true;record('C06',`已采用${s.alt}；替代路线选择是战略意图`);return;
case'stop-request':if(s.mode!=='l4'||s.fallback){record('C08','仅L4运行时可以提交该停靠请求；当前驾驶权未改变');return}s.stopRequest=true;record('C08','停靠请求已接收，系统将判断可行位置；不是立即刹停');return;
case'hvac':s.hvac=!s.hvac;record('D05',`空调运行${bool(s.hvac)}；未复用AUTO键`);return;
case'direction':record('D06',`送风方向已选择“${s.direction}”（模拟能力）`);return;
case'right-fan':if(!s.independentFan){record('D08','当前模拟车辆不支持副驾独立风量；请使用共享空调设置');return}record('D08',`副驾独立风量偏好 ${s.rightFan}（能力模拟）`);return;
case'rear-defog':s.rearDefog=!s.rearDefog;record('D09',`后风挡除雾${bool(s.rearDefog)}；前除雾状态未改变`);return;
case'play':s.playing=!s.playing;record('E03',s.playing?'媒体开始播放（界面模拟，无真实音频）':'媒体已暂停');return;
case'prev':s.track=(s.track+s.tracks.length-1)%s.tracks.length;record('E04',`上一首：${s.tracks[s.track]}`);return;
case'next':s.track=(s.track+1)%s.tracks.length;record('E04',`下一首：${s.tracks[s.track]}`);return;
case'track-apply':s.playing=true;record('E05',`已选择媒体：${s.tracks[s.track]}`);return;
case'output':record('E06',`已选择 ${s.output}（仅模拟输出路由，无真实设备）`);return;
case'call-answer':s.call='通话中';record('E07',`${s.callOwner}通话已接通（模拟）；媒体静音不影响此通路`);return;
case'call-reject':s.call='已拒绝';record('E07','模拟来电已拒绝');return;
case'call-end':s.call='已结束';record('E07','模拟通话已结束');return;
case'voice-run':if(!s.voiceInput.trim()){record('E08','请输入演示语音文本，未执行任何任务');return}s.voice=`识别：“${s.voiceInput}”`;if(/静音/.test(s.voiceInput)){s.mute=true;s.voice+='；媒体已静音'}else if(/回位|召回/.test(s.voiceInput)){s.wheel='已展开';s.voice+='；回位请求完成，未交权'}else if(/目的地/.test(s.voiceInput)){s.voice+='；请在目的地任务中检查并选择结果'}else{s.voice+='；未匹配本地演示指令，请使用可见控件'}record('E08',s.voice);return;
case'voice-cancel':s.voice='已取消';s.voiceInput='';record('E08','语音请求已取消');return;
case'seat':record('F01',`座椅示意位置已设为 ${s.seat}；不是实际可躺角度或安全验证`);return;
case'seat-heat':record('F02',`个人座椅舒适：${s.seatHeat}（车辆能力模拟）`);return;
case'reading':s.reading=!s.reading;record('F03',`阅读照明${bool(s.reading)}；不兼任驾驶权状态灯`);return;
case'window':record('F04',`车窗示意开度 ${s.window}%（本地入口模拟）`);return;
case'shade':s.shade=!s.shade;record('F04',`遮阳${bool(s.shade)}（能力模拟）`);return;
case'message':if(s.personalOwner==='主驾'&&s.mode==='manual'&&s.gear!=='P'){record('F05','人工行驶时不展开主驾私人消息；请驻车或进入L4乘员状态');return}s.messageOpen=!s.messageOpen;record('F05',s.messageOpen?`仅在${s.personalOwner}所属区展开了虚构消息`:'已收起个人消息');return;
case'share':if(!s.shareDraft.trim()){record('F06','请输入要分享的内容');return}s.shared=s.shareDraft.trim();s.sharedBy=s.personalOwner;record('F06',`${s.personalOwner}已提交“${s.shared}”，可在本门C03查看后添加，不静默修改目的地`);return;
case'activity':if(s.fallback||(s.pending&&s.personalOwner==='主驾')){record('F07','正在交接或后备处置，本座活动保持暂停');return}if(s.personalOwner==='主驾'&&s.mode==='manual'&&s.gear!=='P'){record('F07','人工行驶时不开放主驾乘员内容；请驻车或进入L4乘员状态');return}s.activityPlaying=!s.activityPlaying;record('F07',`${s.personalOwner}的${s.activity}${s.activityPlaying?'已打开':'已暂停'}（内容框架模拟，无真实播放服务）`);return;
case'charge-plan':s.chargePlan=true;record('G02',`已把 ${s.chargeStation} 加入充电规划；未实现自动接枪`);return;
case'charge-start':if(s.gear!=='P'||s.speed!==0){record('G03','请先载入驻车场景；行驶中不开始充电演示');return}s.charging=!s.charging;record('G03',s.charging?'充电状态演示已开始，无真实电能操作':'充电状态演示已暂停');return;
case'lights':record('G06',`本地灯光控制：${s.lights}`);return;
case'wiper':record('G07',`本地雨刷控制：${s.wiper}`);return;
case'wash':s.washCount++;record('G07',`洗涤动作模拟 ${s.washCount} 次`);return;
case'horn':s.hornCount++;record('B11',`左门鸣笛动作模拟 ${s.hornCount} 次；不产生真实声音或车辆动作`);return;
case'help':s.help='模拟连接中';record('G08','已发起本地求助演示，没有拨打电话或联系外部服务');return;
case'help-cancel':s.help='模拟已取消';record('G08','已取消求助演示');return;
case'lock':s.locked=!s.locked;record('G09',`门锁${s.locked?'已锁止':'已解锁'}（模拟）`);return;
case'trunk':if(s.speed!==0||s.gear!=='P'){record('G09','车辆未驻车，行李厢开启请求未执行');return}s.trunk=!s.trunk;record('G09',`行李厢${s.trunk?'已打开':'已关闭'}（模拟）`);return;
case'park':if(s.mode!=='manual'){s.stopRequest=true;record('G10','L4起停由系统检查条件后执行，未直接释放制动');return}if(!s.doorClosed||!s.belt){record('G10','车门／安全带状态未满足本演示起行条件');return}if(s.speed!==0){record('G10','当前车速不为零，未直接切入驻车状态');return}s.gear=s.gear==='P'?'D':'P';record('G10',`本地驻车操作模拟：${s.gear}挡`);return;
case'account':record('H01',`已选择${s.account}；未自动移动座椅或改变驾驶权`);return;
case'pair':s.paired=!s.paired;record('H02',s.paired?`${s.device}已模拟连接，无真实蓝牙配对`:'模拟设备连接已断开');return;
case'permissions':record('H03',`共享权限已保存：路线${s.routePermission}，媒体${s.mediaPermission}`);return;
case'privacy':s.privacy=!s.privacy;record('H04',`个人内容共享授权${bool(s.privacy)}，不代表上传数据`);return;
case'recording':s.recording=!s.recording;record('H04',`数据记录偏好${bool(s.recording)}，本演示不录音录像、不上传`);return;
case'display':record('H05',`本座显示偏好已保存：亮度${s.brightness}%，${s.fontSize}字号，语音反馈${bool(s.speech)}；必要状态保持可见`);return;
case'update':if(s.speed!==0||s.gear!=='P'){record('H06','模拟车辆尚未驻车，不能开始维护演示');return}s.update='本地更新演示已完成（未安装任何软件）';record('H06',s.update);return;
default:throw Error('Unregistered action: '+action);
}}

function sim(action){switch(action){
case'driver-ready':if(s.pending!=='manual'||s.wheel!=='已展开'||s.fallback){inDoor('L',()=>record('A08','就绪模拟未生效：需要恢复请求、回位完成且无后备阻断'));return}s.driverReady=true;inDoor('L',()=>{eventTask='A08';record('A08','外部演示工具：模拟人员与接口条件就绪，仍未交权')});return;
case'availability':s.available=!s.available;record('A02',`演示条件${s.available?'可用':'不可用'}；不改变当前驾驶权`);return;
case'speed':s.speed=s.speed===0?30:0;record('B01',`外部演示车速 ${s.speed} km/h`);return;
case'gear':s.gear=s.gear==='P'?'R':'P';record('B02','外部演示挡位：'+s.gear);return;
case'turn-left':s.turn=s.turn==='左转'?'关闭':'左转';record('B03','本地转向指示模拟：'+s.turn);return;
case'turn-right':s.turn=s.turn==='右转'?'关闭':'右转';record('B03','本地转向指示模拟：'+s.turn);return;
case'behavior':s.notice=s.notice?'':s.mode==='manual'?'前方有行人，当前仍由人驾驶。':'正在等待行人，系统保持控制，无需逐次批准动作。';record('B04','已切换系统行为解释');return;
case'planned':scene('planned');selected='B05';render();return;
case'fault':scene('fault');selected='B06';render();return;
case'fallback-next':if(!s.fallback){scene('fault')}else if(s.fallback===1){s.fallback=2;s.speed=15;s.notice='系统正在寻找场景允许的较低风险停靠位置。'}else{s.fallback=3;s.speed=0;s.gear='P';s.mode='mrc';s.notice='模拟最小风险停车已完成；未发生自动人工交权。'}record('B07','由外部演示台推进系统后备状态；不依赖乘员响应');return;
case'risk':scene('fault');selected='B08';s.notice='模拟严重车辆风险：系统正在执行后备。';record('B08','已触发严重风险提示，场景为系统驾驶');return;
case'next-turn':s.detour=!s.detour;record('C05','导航引导示意已变化');return;
case'trip-progress':s.arrival=1;record('C07','行程进度演示：接近目的地，尚未停稳');return;
case'stop-complete':if(!s.stopRequest){record('C08','请先提出停靠请求');return}s.arrival=2;s.speed=0;s.gear='P';record('C08','系统停靠完成（外部推进模拟）；没有交出驾驶权');return;
case'arrival':s.arrival=(s.arrival+1)%3;if(s.arrival===2){s.speed=0;s.gear='P'}record('C09','到达示意：'+['行程中','接近目的地，尚未停稳','已停稳，仍需确认下车环境'][s.arrival]);return;
case'right-fan-support':s.independentFan=!s.independentFan;record('D08',`独立风量模拟能力${bool(s.independentFan)}；不表示参考车实际配置`);return;
case'incoming':s.call='虚构来电';record('E07','已触发虚构联系人来电，无真实呼叫');return;
case'low-battery':s.soc=15;record('G01','已触发低电量示意，请查看共享充电规划');return;
case'charge-start':activeChannel='simulation';act('charge-start');return;
case'charge-progress':if(!s.charging){record('G03','请先开始充电状态演示');return}s.soc=clamp(s.soc+5,0,100);record('G03',`充电示意进度 ${s.soc}%`);return;
case'tire':s.tire=s.tire==='正常'?'左前轮异常':'正常';record('G04','模拟胎压状态：'+s.tire);return;
case'door':s.doorClosed=!s.doorClosed;record('G05',s.doorClosed?'模拟车门已闭合':'模拟右前门未闭合');return;
case'belt':s.belt=!s.belt;record('G05',s.belt?'模拟安全带已系好':'模拟安全带未系好');return;
case'help-connected':s.help='模拟已接通';record('G08','求助演示状态已接通，无外部联系');return;
case'help-failed':s.help='模拟连接失败，请使用可行的本地求助方式';record('G08','演示求助连接失败，没有真实拨号');return;
case'wheel-failed':s.wheel='回位受阻';s.driverReady=false;record('A08','模拟回位受阻，禁止将未完成回位显示为就绪');return;
default:throw Error('Unregistered simulation: '+action);
}}

const fieldSpecs={
 driverReady:{label:'驾驶就绪',boolean:true},
 temp:{label:'主驾温度',min:16,max:30,step:.5},fan:{label:'主驾风量',min:0,max:7,step:1},
 rightTemp:{label:'副驾温度',min:16,max:30,step:.5},rightFan:{label:'副驾风量',min:0,max:7,step:1},
 volume:{label:'媒体音量',min:0,max:100,step:5},track:{label:'媒体曲目',choices:['山海之间','静谧公路','清晨电台'],numeric:true},
 output:{label:'声音输出',choices:['共享扬声器','本座个人耳机']},
 navVolume:{label:'导航音量',min:0,max:100,step:5},callVolume:{label:'本座通话音量',min:0,max:100,step:5},
 destDraft:{label:'目的地草稿',text:true,presets:['西岸美术馆','滨江公园','城市图书馆']},
 stopDraft:{label:'经停点草稿',text:true,presets:['咖啡馆','充电站','滨江公园']},
 shareDraft:{label:'分享内容草稿',text:true,presets:['滨江公园','一起去美术馆','下一站咖啡馆']},
 voiceInput:{label:'语音文本草稿',text:true,presets:['媒体静音','方向盘回位','更改目的地']},
 device:{label:'设备名称草稿',text:true,presets:['我的手机','平板电脑','个人耳机']},
 routePref:{label:'路线偏好',choices:['推荐路线','优先少收费','沿江风景路线']},
 alt:{label:'替代路线',choices:['沿江路线','城市快速路','原路线']},
 direction:{label:'送风方向',choices:['吹面','吹脚','吹面＋吹脚']},
 seat:{label:'本座座椅位置',min:0,max:100,step:5},
 seatHeat:{label:'座椅舒适',choices:['关闭','加热','通风']},
 window:{label:'本座车窗开度',min:0,max:100,step:10},
 activity:{label:'本座活动',choices:['阅读','视频界面']},
 chargeStation:{label:'充电站',choices:['西岸充电站','滨江充电站','城市中心充电站']},
 lights:{label:'灯光',choices:['关闭','近光','远光','自动灯光']},
 wiper:{label:'雨刷',choices:['关闭','低速','高速','自动']},
 account:{label:'本座账户',choices:['访客','个人配置']},
 routePermission:{label:'共享路线策略',choices:['共同确认','仅行程发起者','双方可提交']},
 mediaPermission:{label:'共享媒体策略',choices:['双方可操作','仅播放发起者']},
 brightness:{label:'本座亮度偏好',min:30,max:100,step:5},fontSize:{label:'本座字号',choices:['标准','大字']},
 speech:{label:'语音反馈偏好',boolean:true}
};
function setField(key,value){
 const id=fieldTasks[key],spec=fieldSpecs[key];
 if(!id||!spec||!canAct(id))return denied(id);
 eventTask=id;showTask(id);
 const restriction=modePolicy.reason(id,s,activeDoor,activeChannel,spec.text?'text':'field');
 if(restriction){record(id,restriction);return}
 if(key==='driverReady'&&(s.pending!=='manual'||s.wheel!=='已展开'||s.fallback)){record(id,'未执行：需先提出人工恢复请求，并完成方向盘回位');return}
 if(key==='fan'&&climateLock())return;
 if(key==='rightFan'&&!s.independentFan){record(id,'未执行：当前没有独立副驾风量能力');return}
 if(spec.min!==undefined){value=Number(value);if(!Number.isFinite(value)){record(id,'未执行：数值无效');return}value=clamp(value,spec.min,spec.max)}
 if(spec.boolean)value=value===true||value==='true';
 if(spec.choices){if(spec.numeric){value=Number(value);if(!Number.isInteger(value)||value<0||value>=spec.choices.length)return record(id,'未执行：选项无效')}else if(!spec.choices.includes(value))return record(id,'未执行：选项无效')}
 if(spec.text)value=String(value).slice(0,80);
 s[key]=value;if(key==='fan')s.auto=false;
 const shown=spec.boolean?(value?'已确认':'已取消'):spec.numeric?spec.choices[value]:value||'空';
 record(id,spec.label+'已设为“'+shown+'”'+(spec.text?'，请执行对应任务按钮提交':''));
}
const btn=(a,label,cls='',disabled=false)=>`<button data-action="${a}" class="${cls}" ${disabled?'disabled':''}>${label}</button>`;
const simbtn=(a,label)=>`<button data-sim="${a}">${label}</button>`;
const val=t=>`<output class="value">${esc(t)}</output>`;
const p=t=>`<p>${esc(t)}</p>`;
const buttons=(...ss)=>`<div class="task-buttons">${ss.join('')}</div>`;
const link=(id,label)=>`<button data-open="${id}">${label}</button>`;
const input=(key,label,placeholder='')=>`<label>${label}<input data-field="${key}" value="${esc(s[key])}" placeholder="${esc(placeholder)}"></label>`;
const select=(key,label,options)=>`<label>${label}<select data-field="${key}">${options.map((v,i)=>`<option value="${esc(key==='track'?i:v)}" ${String(s[key])===String(key==='track'?i:v)?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`;
const slider=(key,label,min,max,step=1)=>`<label>${label}<div class="range-controls"><input type="range" data-field="${key}" aria-label="${label}" min="${min}" max="${max}" step="${step}" value="${s[key]}"><span>${s[key]}</span></div></label>`;
const check=(key,label)=>`<label class="check"><input type="checkbox" data-field="${key}" ${s[key]?'checked':''}>${label}</label>`;
const readonly=(value,note='系统主动显示；无需用户点击确认')=>`<span class="read-only">系统信息</span>${val(value)}${p(note)}`;
function body(id){switch(id){
case'A01':return readonly(role(),`当前角色锚点保持稳定。${s.pending?'正在准备交接，但当前控制者未改变。':'无待完成交接。'}`)+buttons(link(s.mode==='manual'?'A03':'A07',s.mode==='manual'?'进入系统驾驶流程':'恢复人工驾驶流程'));
case'A02':return readonly(s.available?'当前条件可用':'当前条件不可用',s.available?'模拟ODD条件满足；仅表示此演示状态':'模拟运行条件变化。系统自行评估，乘员不用判断道路是否安全。');
case'A03':return p(s.mode==='manual'?'先提出意愿，再由系统判断并等待确认。':'系统已在驾驶，不重复启用。')+buttons(btn('enable-request','请求启用 L4','primary'),...(s.pending==='enable'?[link('A04','下一步：交权确认')]:[]));
case'A04':return val(s.phase)+p('此按钮仅是概念确认动作，不能证明真实交权机制。')+buttons(btn('enable-confirm','确认由系统驾驶','primary',s.pending!=='enable'||!s.available));
case'A05':return readonly(s.wheel,'机构状态模拟：系统先承担驾驶，才允许收纳；没有机构或气囊验证。');
case'A06':return val(s.wheel)+p('左门固定快捷区可召回方向盘；只请求回位，不接受人工驾驶权。')+buttons(btn('recall','请求方向盘回位'),link(s.pending==='manual'?'A08':'A07',s.pending==='manual'?'下一步：查看就绪':'提出人工恢复意愿'));
case'A07':return val(role())+p('恢复意愿与方向盘回位分开；无响应也不把风险交给人。')+buttons(btn('manual-request','我想恢复人工驾驶','primary',s.mode==='manual'),...(s.pending==='manual'?[link('A06','下一步：方向盘回位'),link('A10','取消本次恢复')]:[]));
case'A08':return readonly(s.wheel==='已展开'?'方向盘已展开':'方向盘尚未就绪',s.pending==='manual'?'请检查回位，再声明人员就绪。':'尚未提出人工恢复请求。')+check('driverReady','我已准备驾驶（仅模拟人员声明）')+buttons(link('A09','下一步：查看交权确认'));
case'A09':return val(role())+p(`回位：${s.wheel} · 人员：${s.driverReady?'已声明就绪':'未就绪'}`)+buttons(btn('manual-confirm','确认恢复人工驾驶','primary',s.pending!=='manual'||s.wheel!=='已展开'||!s.driverReady||!!s.fallback))+p('不满足条件时按钮不可用；实际确认载体待设计。');
case'A10':return val(s.pending==='manual'?'人工恢复尚未完成':'没有待取消的恢复请求')+buttons(btn('cancel-manual','取消本次恢复请求','',s.pending!=='manual'));
case'B01':return readonly(`${s.speed} km/h`,'车速是模拟状态；外部演示台可切换，车内不把它做成可点击开关。');
case'B02':return readonly(`${s.gear} 挡`,s.gear==='P'?'模拟车辆驻车中':'实际挡位反馈；这里不是新增换挡器');
case'B03':return readonly(`${s.turn==='关闭'?'转向灯关闭':s.turn} · ${s.lights}`,'灯光反馈留固定位置。左门可演示转向指示输入；不代表指挥自动驾驶变道。')+buttons(simbtn('turn-left','模拟本地左转指示'),simbtn('turn-right','模拟本地右转指示'));
case'B04':return readonly(s.notice||'车辆沿当前路线运行','系统行为解释按情境出现，不需要乘员批准每次驾驶动作。');
case'B05':return readonly(s.planned?'运行范围即将结束':'当前无计划退出事件',s.planned?'系统安排后备；自愿人工恢复是另一分支。':'可在演示台触发计划退出。');
case'B06':return readonly(s.fallback?'系统无法继续正常运行':'系统运行正常',s.fallback?'系统正在执行后备，不依赖乘员接管。':'可在外部演示台触发故障场景。');
case'B07':return readonly(['当前无需后备','系统正在减速','正在寻找场景允许的停靠位置','模拟已停稳，未发生人工交权'][s.fallback],'进展由系统状态驱动；进度由车外演示台推进，门屏只显示系统状态。');
case'B08':return readonly(s.fallback?'存在模拟严重车辆风险':'当前无严重风险提示','严重时中间优先显示，两侧同步语义；不要求点击确认才处置。');
case'B09':return val(s.hazard?'双闪已开启':'双闪已关闭')+p('左门固定快捷区与两门安全任务页均可开启双闪。')+buttons(btn('hazard','切换双闪'));
case'B10':return val(s.defog?'前除雾中':'前除雾已关闭')+p(s.defog?'风量、AUTO和循环由策略接管；操作不会排队。':'左门固定快捷区与两门空调任务页均可开启前除雾。')+buttons(btn('defog','切换前除雾'));
case'B11':return val(`喇叭模拟 ${s.hornCount} 次`)+buttons(btn('horn','鸣笛演示'))+p('实际触达与快速操作仍待验证。');
case'B12':return val(s.parkingView?'中央周边影像示意已展开':'中央周边影像示意已收起')+buttons(btn('parking-view',s.parkingView?'收起中央影像':'在中央显示周边影像'))+p('影像框架不是真实传感器；L4下无需乘员监督系统泊车。');
case'C01':return input('destDraft','输入目的地','例如：滨江公园')+buttons(btn('dest-apply','设为目的地','primary'),link('C02','路线偏好'),link('C03','编辑经停'),link('C04','导航开关'))+p(`当前：${s.destination}`);
case'C02':return select('routePref','路线偏好',['推荐路线','优先少收费','沿江风景路线'])+buttons(btn('pref-apply','应用路线偏好'));
case'C03':return p(s.shared?`${s.sharedBy}已提交：${s.shared}`:'双方可提交经停，实际权限冲突规则仍待验证。')+input('stopDraft','经停点')+buttons(btn('stop-add','添加经停','primary'),btn('stop-clear','清空经停'))+p(s.stops.length?s.stops.join(' → '):'还没有经停点');
case'C04':return val(s.nav?'导航运行中':'导航已结束')+buttons(btn('nav-toggle',s.nav?'结束导航':'开始导航'))+p('结束导航不退出L4，也不直接刹停。');
case'C05':return readonly(s.nav?(s.detour?'600 m 后驶入沿江路':'800 m 后右转'):'当前未导航','人工驾驶时在左侧提供简短引导；L4时回到中间共同区。');
case'C06':return p(s.detour?'替代路线已生效':'模拟前方拥堵，可比较行程偏好。')+select('alt','替代路线',['沿江路线','城市快速路','原路线'])+buttons(btn('detour','选择此路线','primary'));
case'C07':return readonly(s.arrival?'接近目的地 · 预计剩余 2 min':'预计 18 min · 剩余 12 km','示意进度，不是真实导航预估；不需要持续监督。');
case'C08':return val(s.stopRequest?'停靠请求已接收':'尚未请求停靠')+p('请求的是适宜位置停靠，不是紧急制动；执行由系统评估。')+buttons(btn('stop-request','请求停靠','primary'));
case'C09':return readonly(['行程中','接近目的地，尚未停稳','已停稳，仍需确认下车环境'][s.arrival],'导航到达不等于可以开门。驻车及下车环境须分别确认。');
case'D01':return val(`${s.temp}°C 主驾目标温度`)+slider('temp','主驾目标温度（示意16—30）',16,30,.5)+buttons(btn('temp-dec','降低 0.5°'),btn('temp-inc','升高 0.5°'));
case'D02':return val(s.defog?'前除雾接管':s.auto?'自动风量':`${s.fan} 档手动风量`)+slider('fan','主驾风量（示意0—7）',0,7)+buttons(btn('fan-dec','减小风量'),btn('fan-inc','增大风量'));
case'D03':return val(s.auto?'自动风量':'手动风量')+buttons(btn('fan-auto','恢复自动风量','primary'))+p('保留目标温度和循环选择；不代表自动驾驶。');
case'D04':return val(s.circ?'内循环':'外循环')+buttons(btn('circ',s.circ?'切换外循环':'切换内循环','primary'))+p('入口在两侧门屏空调任务中。前除雾中不接受切换，不暗藏第三态。');
case'D05':return val(`空调运行${bool(s.hvac)}`)+p(`主驾 ${s.temp}°C · 副驾 ${s.rightTemp}°C · ${s.auto?'自动风量':s.fan+'档手动风量'} · ${s.circ?'内循环':'外循环'}`)+buttons(btn('hvac',s.hvac?'关闭空调':'开启空调'),link('D01','主驾温度'),link('D02','风量 / AUTO'),link('D04','内外循环'),link('D06','送风方向'),link('D07','副驾舒适'),link('D09','后除雾'));
case'D06':return select('direction','送风方向',['吹面','吹脚','吹面＋吹脚'])+buttons(btn('direction','应用送风方向'))+p('模拟送风能力，最终分区与风道能力待核实。');
case'D07':return val(`${s.rightTemp}°C 副驾目标温度`)+slider('rightTemp','副驾目标温度（示意）',16,30,.5)+p(`主驾保持 ${s.temp}°C，不误用主驾调节件。`);
case'D08':return val(s.independentFan?`副驾偏好 ${s.rightFan} 档`:'共享风量，无独立右侧风量')+(s.independentFan?slider('rightFan','副驾风量（模拟能力）',0,7):p('默认不假设原车有独立风量。右侧演示台可切换能力进行比较。'))+buttons(btn('right-fan','确认风量偏好'));
case'D09':return val(`后除雾${bool(s.rearDefog)}`)+buttons(btn('rear-defog','切换后风挡除雾'))+p('能力模拟；与前除雾任务保持独立。');
case'E01':return val(`${s.volume}${s.mute?' · 媒体静音中':''}`)+slider('volume','媒体目标音量（示意0—100）',0,100)+buttons(btn('volume-dec','减小音量'),btn('volume-inc','增大音量'))+p('静音中改变目标音量不自动解除静音。');
case'E02':return val(s.mute?'媒体静音':'媒体未静音')+buttons(btn('mute',s.mute?'恢复媒体声音':'媒体静音'))+p('导航、通话及安全告警不受影响。');
case'E03':return val(s.tracks[s.track])+p(s.playing?'媒体播放状态：播放中（无真实音频）':'媒体播放状态：暂停')+buttons(btn('play',s.playing?'暂停':'播放','primary'));
case'E04':return val(s.tracks[s.track])+buttons(btn('prev','上一首'),btn('next','下一首'));
case'E05':return select('track','选择演示内容',s.tracks)+buttons(btn('track-apply','播放所选内容','primary'),link('E03','播放 / 暂停'),link('E04','切歌'),link('E06','声音输出'),link('E07','通话'),link('E08','语音'));
case'E06':return select('output','选择输出（能力模拟）',['共享扬声器','本座个人耳机'])+buttons(btn('output','应用输出'))+p('不连接真实设备，不自动把个人内容广播到共同区。');
case'E07':return val(s.call)+p(s.callOwner+'的个人通话')+p('联系人：林先生（虚构），详情只在所属区显示。')+buttons(btn('call-answer','接听','primary'),btn('call-reject','拒绝'),btn('call-end','挂断'));
case'E08':return input('voiceInput','语音文本演示','试试：媒体静音 / 方向盘回位')+buttons(btn('voice-run','提交演示文本','primary'),btn('voice-cancel','取消'))+p(s.voice)+p('不启用麦克风，也不调用外部识别服务。');
case'E09':return slider('navVolume','导航播报目标音量（示意）',0,100)+slider('callVolume','通话目标音量（示意）',0,100)+p(`媒体目标音量仍为 ${s.volume}${s.mute?'，媒体仍静音':''}；安全告警不在此关闭。`);
case'F01':return slider('seat','本人座椅位置示意',0,100)+buttons(btn('seat','模拟本地座椅调节'))+p('不是躺姿角度；座椅、约束和碰撞安全尚未验证。');
case'F02':return select('seatHeat','个人座椅舒适（能力模拟）',['关闭','加热','通风'])+buttons(btn('seat-heat','应用个人设置'));
case'F03':return val(`个人阅读灯${bool(s.reading)}`)+buttons(btn('reading','模拟本地阅读灯'));
case'F04':return slider('window','车窗开度示意',0,100)+buttons(btn('window','模拟本地车窗控制'),btn('shade',s.shade?'收起遮阳':'展开遮阳'));
case'F05':return p(s.messageOpen?'虚构消息：周末一起去美术馆吗？仅在此所属区展示。':'个人消息摘要：1条虚构消息。')+buttons(btn('message',s.messageOpen?'收起正文':'在所属区查看'));
case'F06':return input('shareDraft','提交到共同区的内容')+buttons(btn('share','分享至共同显示区','primary'))+p(s.shared?`已提交：${s.shared}`:'分享是显式动作，不静默替换他人的行程。');
case'F07':return select('activity','乘员活动',['阅读','视频界面'])+p(s.activityPlaying?'内容框架已打开。示意文章：在移动空间中保留个人的节奏。':'尚未打开乘员活动。')+buttons(btn('activity',s.activityPlaying?'暂停活动':'打开活动','primary'))+p('仅模拟内容框架。人工驾驶时避免驾驶者可见的高干扰内容，隔离设计待验证。');
case'G01':return readonly(`${s.soc}% · 预计续航 ${s.soc*5} km`,'数值仅示意，不是真实车辆测量或续航模型。低电量升级到共同区。');
case'G02':return select('chargeStation','选择示意充电点',['西岸充电站','滨江充电站','城市中心充电站'])+buttons(btn('charge-plan','加入充电规划','primary'))+p(s.chargePlan?`已规划：${s.chargeStation}`:'未规划充电；不包含自动接枪。');
case'G03':return val(`${s.soc}% · ${s.charging?'充电示意中':'未充电'}`)+buttons(btn('charge-start',s.charging?'暂停演示':'开始充电状态演示'))+p('需模拟车辆驻车。演示进度由外部演示台推进，无真实充电。');
case'G04':return readonly(`胎压 / 健康：${s.tire}`,'普通详情按需；严重异常主动升级。未连接车辆传感器。')+buttons(btn('health-query','查看车辆健康'),link('G01','电量 / 续航'),link('G02','充电规划'),link('G03','充电状态'),link('G05','乘员状态'),link('G09','门锁 / 行李厢'),link('G08','道路救援'));
case'G05':return readonly(`${s.doorClosed?'车门已闭合':'右前门未闭合'} · ${s.belt?'安全带已系好':'安全带未系好'}`,'定位相关乘员；这里只模拟必要起行条件，不替代真实车辆联锁。');
case'G06':return select('lights','本地灯光入口模拟',['关闭','近光','远光','自动灯光'])+buttons(btn('lights','应用本地灯光设置'))+p('左门提供控制入口；必要灯光指示在中央大屏持续显示。');
case'G07':return select('wiper','本地雨刷入口模拟',['关闭','低速','高速','自动'])+buttons(btn('wiper','应用雨刷设置'),btn('wash','模拟洗涤一次'))+p(`洗涤次数：${s.washCount}；不以多级屏幕菜单作为唯一快速入口。`);
case'G08':return val(s.help)+buttons(btn('help','模拟本地求助入口','danger'),btn('help-cancel','取消求助演示'))+p('不会联系他人或拨号。可在演示台查看接通／失败反馈。');
case'G09':return val(`${s.locked?'门已锁':'门已解锁'} · 行李厢${s.trunk?'打开':'关闭'}`)+buttons(btn('lock','切换门锁'),btn('trunk','开关行李厢'))+p('行李厢仅在示意驻车条件下操作。');
case'G10':return val(`${s.gear} 挡 · ${s.speed===0?'车辆静止':'模拟行驶中'}`)+buttons(btn('park',s.mode==='manual'?'模拟本地驻车控制':'提出起停意图'))+p('L4起停由系统判断，不通过乘员一按直接释放制动。');
case'H01':return select('account','选择本座账户',['访客','个人配置'])+buttons(btn('account','应用账户'))+p('账户选择不自动触发座椅运动或交权。');
case'H02':return input('device','演示设备名称')+buttons(btn('pair',s.paired?'断开演示连接':'模拟连接设备'))+p(s.paired?`已模拟连接：${s.device}`:'未连接真实设备');
case'H03':return select('routePermission','路线修改权限',['共同确认','仅行程发起者','双方可提交'])+select('mediaPermission','共享媒体权限',['双方可操作','仅播放发起者'])+buttons(btn('permissions','保存权限设置'),link('H01','账户'),link('H02','设备'),link('H04','隐私'),link('H05','显示'),link('H06','维护'))+p('候选权限规则；目前用于比较，不冒充已经完成权限系统。');
case'H04':return val(`内容共享授权：${bool(s.privacy)}`)+buttons(btn('privacy','切换内容共享授权'),btn('recording','切换记录偏好'))+p(`记录偏好：${bool(s.recording)}。无录音、录像和数据上传，设置仅保存在当前演示内存。`);
case'H05':return slider('brightness','显示亮度偏好示意',30,100)+select('fontSize','字号偏好',['标准','大字'])+check('speech','允许语音反馈（偏好模拟）')+buttons(btn('display','应用显示偏好'))+p('此页只模拟偏好，不会关闭必要安全语义。');
case'H06':return val(s.update)+buttons(btn('update','开始本地维护演示'))+p('仅驻车时允许，不下载或安装任何软件。');
default:throw Error('Missing task body: '+id);
}}

const simMap={A02:[['availability','切换模拟可用条件']],A05:[['wheel-failed','模拟回位受阻']],A08:[['wheel-failed','模拟回位受阻']],B01:[['speed','切换模拟车速']],B02:[['gear','切换模拟挡位']],B03:[['turn-left','本地左转指示'],['turn-right','本地右转指示']],B04:[['behavior','触发行为解释']],B05:[['planned','触发计划退出']],B06:[['fault','触发系统故障']],B07:[['fallback-next','推进系统后备阶段']],B08:[['risk','触发严重风险']],B11:[['horn','模拟实体喇叭']],C05:[['next-turn','切换路线引导']],C07:[['trip-progress','推进行程示意']],C08:[['stop-complete','推进系统停靠']],C09:[['arrival','推进到达状态']],D08:[['right-fan-support','切换独立风量能力']],E07:[['incoming','触发虚构来电']],G01:[['low-battery','触发低电量']],G03:[['charge-start','开始 / 暂停充电状态演示'],['charge-progress','推进充电示意']],G04:[['tire','切换胎压异常']],G05:[['door','切换车门状态'],['belt','切换安全带状态']],G08:[['help-connected','模拟接通'],['help-failed','模拟连接失败']]};


const staticActions={
 'fan-inc':'增加风量','fan-dec':'降低风量','fan-auto':'恢复 AUTO','temp-inc':'升高温度','temp-dec':'降低温度',
 'volume-inc':'增大媒体音量','volume-dec':'减小媒体音量','mute':'切换媒体静音','recall':'请求方向盘回位',
 'hazard':'切换双闪','defog':'切换前除雾','circ':'切换内外循环',
 'enable-request':'请求启用 L4','enable-confirm':'确认由系统驾驶','manual-request':'请求恢复人工驾驶',
 'manual-confirm':'确认接受人工驾驶权','cancel-manual':'取消人工恢复请求',
 'dest-apply':'设为目的地','pref-apply':'应用路线偏好','stop-add':'添加经停','stop-clear':'清空经停',
 'nav-toggle':'开始 / 结束导航','detour':'采用替代路线','stop-request':'请求适宜位置停靠',
 'hvac':'切换空调运行','direction':'应用送风方向','right-fan':'确认副驾风量','rear-defog':'切换后除雾',
 'play':'播放 / 暂停','prev':'上一首','next':'下一首','track-apply':'播放所选曲目','output':'应用声音输出',
 'call-answer':'接听','call-reject':'拒接','call-end':'挂断','voice-run':'提交语音演示文本','voice-cancel':'取消语音请求',
 'seat':'应用本座座椅位置','seat-heat':'应用座椅舒适','reading':'切换阅读灯','window':'应用车窗开度','shade':'切换遮阳',
 'message':'展开 / 收起消息','share':'分享至共同区域','activity':'打开 / 暂停本座内容',
 'charge-plan':'规划充电站','charge-start':'开始 / 暂停充电演示','health-query':'查看车辆健康','lights':'应用灯光设置','wiper':'应用雨刷设置',
 'wash':'洗涤一次','horn':'鸣笛演示','help':'发起求助演示','help-cancel':'取消求助演示',
 'lock':'切换门锁','trunk':'开关行李厢','park':'提出起停 / 驻车意图',
 'account':'应用本座账户','pair':'连接 / 断开设备','permissions':'保存共享策略','privacy':'切换共享授权',
 'recording':'切换记录偏好','display':'保存本座显示偏好','update':'开始维护演示','parking-view':'展开 / 收起周边影像'
};
function fieldButtons(key){
 const spec=fieldSpecs[key];if(!spec||!canAct(fieldTasks[key]))return '';
 const button=(label,attributes)=>'<button '+attributes+'>'+esc(label)+'</button>';
 let content='';
 if(spec.boolean)content=[true,false].map(v=>button((v?'确认':'取消')+spec.label,'data-field="'+key+'" data-value="'+v+'"')).join('');
 else if(spec.min!==undefined)content=[-spec.step,spec.step].map(delta=>button((delta<0?'降低':'增加')+spec.label,'data-field="'+key+'" data-delta="'+delta+'"')).join('');
 else if(spec.choices)content=spec.choices.map((option,i)=>button('选择'+option,'data-field="'+key+'" data-value="'+esc(spec.numeric?i:option)+'"')).join('');
 else if(spec.text)content=spec.presets.map(option=>button('填写'+option,'data-field="'+key+'" data-value="'+esc(option)+'"')).join('')+button('自定义'+spec.label,'data-keyboard="'+key+'"');
 return '<div class="control-group" data-field-controls="'+key+'">'+content+'</div>';
}
function controlsHTML(id){
 const template=document.createElement('template');template.innerHTML=body(id);
 const restriction=modePolicy.reason(id,s,activeDoor,'touch');
 if(restriction&&layout[id].actionDoors.includes(activeDoor))return '<div class="task-controls" data-task-card="'+id+'"><button data-explain="'+id+'">查看操作说明</button>'+(modePolicy.physicalTasks.includes(id)?'<button data-locate-physical="'+id+'">定位实体控件</button>':'')+'</div>';
 if(id==='E08'&&modePolicy.uiMode(s,activeDoor)==='manual')return '<div class="task-controls" data-task-card="'+id+'"><button data-action="voice-wake">唤醒语音</button><button data-action="voice-cancel">取消语音</button></div>';
 const fieldKeys=[...new Set([...template.content.querySelectorAll('[data-field]')].map(n=>n.dataset.field))];
 const commandButtons=[...template.content.querySelectorAll('button')].map(button=>{
  const a=button.dataset.action,target=button.dataset.open,simulation=button.dataset.sim;
  if(a)return canAct(actionTasks[a])?'<button data-action="'+a+'">'+esc(staticActions[a]||button.textContent)+'</button>':'';
  if(target)return layout[target]?.doors.includes(activeDoor)?'<button data-open="'+target+'">'+esc(button.textContent)+'</button>':'';
  if(simulation)return canAct('B03')?'<button data-sim="'+simulation+'">'+esc(button.textContent)+'</button>':'';
  return '';
 }).join('');
 return '<div class="task-controls" data-task-card="'+id+'">'+fieldKeys.map(fieldButtons).join('')+'<div class="command-buttons">'+commandButtons+'</div></div>';
}
function centralHTML(id){
 const template=document.createElement('template');template.innerHTML=body(id);
 if(activeDoor==='L'&&(s.pending==='manual'||(s.mode==='manual'&&(s.gear!=='P'||s.speed>0)))&&['F05','F07'].includes(id))return '<p>主驾内容已暂停，当前位置已保留；请驻车或进入L4后继续。</p>';
 template.content.querySelectorAll('button').forEach(n=>n.remove());
 template.content.querySelectorAll('label').forEach(label=>{
  const input=label.querySelector('[data-field]');if(!input)return;
  const key=input.dataset.field,spec=fieldSpecs[key];if(!spec){label.remove();return}
  const raw=s[key],value=spec.boolean?bool(raw):spec.numeric?spec.choices[raw]:raw;
  const line=document.createElement('div');line.className='state-field';
  const title=document.createElement('span');title.textContent=spec.label;
  const text=document.createElement('strong');text.textContent=String(value??'空');
  line.append(title,text);label.replaceWith(line);
 });
 template.content.querySelectorAll('input,select,textarea,[tabindex],.task-buttons').forEach(n=>n.remove());
 template.content.querySelectorAll('p').forEach(n=>{
  n.textContent=n.textContent.replaceAll('仅在此所属区展示','仅在中央本座区域展示').replaceAll('本门C03','共享区 C03').replaceAll('右侧演示台','外部演示台').replaceAll('所属区','中央本座区域');
 });
 const wrapper=document.createElement('div');wrapper.append(template.content);
 return wrapper.innerHTML;
}
function keyboardHTML(side){
 const key=keyboard[side];if(!key)return '';
 const keys='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -'.split('');
 return '<div class="touch-keyboard" aria-label="自定义文本按键">'+keys.map(char=>'<button data-key="'+esc(char)+'">'+(char===' '?'空格':esc(char))+'</button>').join('')+
 '<button data-edit="backspace">退格</button><button data-edit="clear">清空</button><button data-edit="done">完成输入</button></div>';
}
function openTask(id,side,scroll=true){
 if(!layout[id])throw Error('Unknown task '+id);
 const target=typeof side==='string'?side:(layout[id].doors.includes(activeDoor)?activeDoor:layout[id].doors[0]);
 if(!layout[id].doors.includes(target))return false;
 activeDoor=target;activeChannel='touch';eventTask=null;selected=id;doorSelections[target]=id;doorGroups[target]=id[0];keyboard[target]=null;showTask(id,target);
 record(id,'已定位“'+tasks.find(t=>t.编号===id).任务或信息+'”，请在门屏操作；结果显示在中央'+({L:'左区',C:'中区',R:'右区'}[feedbackZone(id,target)]));
 return true;
}
function renderLibrary(){
 const q=($('search')?.value||'').trim().toLowerCase(),kind=$('filter-type')?.value||'',a=$('filter-actor')?.value||'',f=$('filter-freq')?.value||'';
 const filtered=tasks.filter(t=>(!group||t.编号[0]===group)&&(!kind||t.类别===kind||layout[t.编号].mode===kind)&&(!a||layout[t.编号].doors.includes(a))&&freqMatch(t,f)&&(!q||(t.编号+' '+t.任务或信息+' '+names[t.编号[0]]).toLowerCase().includes(q)));
 if($('task-count'))$('task-count').textContent=filtered.length+' / 72 项';
 if($('task-list'))$('task-list').innerHTML=filtered.length?filtered.map(t=>{
  const plan=layout[t.编号];
  return '<div class="task-row" data-row="'+t.编号+'"><span class="task-id">'+t.编号+'</span><div class="name"><strong>'+esc(t.任务或信息)+'</strong><small>'+esc(t.类别)+' · '+actorLabel(t)+'</small><p>'+plan.doors.map(side=>(side==='L'?'左门':'右门')+'按钮 → 中央'+({L:'左区',C:'中区',R:'右区'}[feedbackZone(t.编号,side)])).join('；')+'</p></div><div class="row-actions">'+plan.doors.map(side=>'<button data-open="'+t.编号+'" data-door-target="'+side+'">'+(side==='L'?'左门':'右门')+'定位 ↗</button>').join('')+'</div></div>';
 }).join(''):'<p class="empty">没有匹配结果。清空筛选可查看全部 72 项。</p>';
 document.querySelectorAll('[data-group]').forEach(b=>b.classList.toggle('active',b.dataset.group===group));
}
function renderDoor(side){
 const category=modePolicy.categories.find(c=>c.id===doorGroups[side])||modePolicy.categories[0];
 const list=$('door-list-'+side),scroll=list?.scrollTop||0;
 if($('door-tabs-'+side))$('door-tabs-'+side).innerHTML=modePolicy.categories.map(c=>'<button data-door-group="'+c.id+'" class="'+(category.id===c.id?'active':'')+'">'+c.label+'</button>').join('');
 if(list){list.innerHTML=tasks.filter(t=>category.groups.includes(t.编号[0])&&layout[t.编号].doors.includes(side)).map(t=>{
  const limited=layout[t.编号].actionDoors.includes(side)&&modePolicy.reason(t.编号,s,side,'touch');
  return '<button class="door-task-entry'+(doorSelections[side]===t.编号?' active':'')+(limited?' restricted':'')+'" data-open="'+t.编号+'"><code>'+t.编号+'</code><span>'+esc(t.任务或信息)+'</span></button>';
 }).join('');list.scrollTop=scroll}
 if($('slot-'+side))$('slot-'+side).innerHTML=inDoor(side,()=>doorSelections[side]?controlsHTML(doorSelections[side])+keyboardHTML(side):'');
 document.querySelectorAll('#door-'+side+' button[data-action]').forEach(b=>{b.removeAttribute('aria-pressed');if(staticActions[b.dataset.action])b.textContent=staticActions[b.dataset.action]});
}
function renderPhysical(){
 const focus=document.activeElement,focusKey=focus?.dataset.knobField,focusSide=focus?.closest('[data-door]')?.dataset.door;
 const button=(action,label)=>'<button data-action="'+action+'">'+label+'</button>';
 const field=(key,delta,label)=>'<button data-field="'+key+'" data-delta="'+delta+'">'+label+'</button>';
 const unit=(id,title,content,cls='')=>'<div class="physical-unit '+cls+'" data-physical-task="'+id+'"><h3>'+title+'</h3><div class="physical-actions">'+content+'</div></div>';
 const knob=(id,key,title,press,pressLabel)=>unit(id,title,'<div class="physical-knob" data-knob-field="'+key+'"'+(press?' data-press="'+press+'"':'')+' tabindex="0" role="group" aria-label="'+title+'：滚轮或方向键调节'+(press?'，回车'+pressLabel:'')+'">'+field(key,-fieldSpecs[key].step,'−')+(press?'<button class="knob-face" data-action="'+press+'" aria-label="'+pressLabel+'">'+(key==='fan'?'AUTO':'静音')+'</button>':'<span class="knob-face" aria-hidden="true"></span>')+field(key,fieldSpecs[key].step,'＋')+'</div>'+'','knob-unit');
 const cycle=(id,key,title)=>unit(id,title,'<button data-cycle-field="'+key+'">拨动'+title+'</button>');
 const knobs=knob('D01','temp','主驾温度')+knob('D02 D03','fan','风量 / AUTO','fan-auto','按压 AUTO')+knob('E01 E02','volume','媒体音量 / 静音','mute','按压静音');
 const left=unit('B03 B11','转向 / 鸣笛','<button data-sim="turn-left">左转指示</button><button data-sim="turn-right">右转指示</button>'+button('horn','鸣笛模拟'))+
 cycle('G06','lights','灯光')+cycle('G07','wiper','雨刷')+unit('G07','洗涤',button('wash','洗涤一次'))+
 unit('F01','主驾座椅',field('seat',-5,'位置 −')+field('seat',5,'位置 ＋'))+
 unit('F04','主驾车窗 / 遮阳',field('window',-10,'车窗 −')+field('window',10,'车窗 ＋')+button('shade','遮阳'))+
 unit('F03','本地照明',button('reading','阅读灯'))+unit('G09','门锁 / 行李厢',button('lock','门锁')+button('trunk','行李厢'))+unit('G10','人工驻车',button('park','驻车 / 起行意图'));
 const safety=unit('B09 B10 A06','固定关键键',button('hazard','双闪')+button('defog','前除雾')+button('recall','方向盘回位'));
 let drivingFlow;
 if(s.pending==='manual'&&!s.fallback){
  drivingFlow=(s.driverReady&&s.wheel==='已展开'?button('manual-confirm','确认接受人工'):'')+button('cancel-manual','取消恢复准备');
 }else if(s.pending==='enable'){
  drivingFlow=button('enable-confirm','确认系统驾驶');
 }else{
  drivingFlow=s.mode==='manual'?button('enable-request','请求系统驾驶'):button('manual-request','请求恢复人工');
 }
 const sosFlow=s.sosPending?button('sos-confirm','确认 SOS')+button('sos-cancel','取消 SOS'):button('sos-request','SOS');
 const flows=unit('A03 A04 A07 A09 A10','驾驶权',drivingFlow)+unit('G08','紧急求助',sosFlow);
 const right=knob('D07','rightTemp','副驾温度')+unit('F01','副驾座椅',field('seat',-5,'位置 −')+field('seat',5,'位置 ＋'))+
 unit('F04','副驾车窗 / 遮阳',field('window',-10,'车窗 −')+field('window',10,'车窗 ＋')+button('shade','遮阳'))+unit('F03','副驾阅读灯',button('reading','阅读灯'));
 if($('physical-safety'))$('physical-safety').innerHTML=safety+knobs+flows;
 if($('physical-L'))$('physical-L').innerHTML=left;
 if($('physical-R'))$('physical-R').innerHTML=right;
 if($('physical-section'))$('physical-section').classList.toggle('primary-channel',['manual','handover','fallback'].includes(modePolicy.uiMode(s)));
 if(selected)document.querySelectorAll('[data-physical-task]').forEach(n=>n.classList.toggle('focused',n.dataset.physicalTask.split(' ').includes(selected)));
 if(focusKey)document.querySelector('[data-door="'+focusSide+'"][data-channel="physical"] [data-knob-field="'+focusKey+'"]')?.focus({preventScroll:true});
}

function render(){
 const signature=modePolicy.uiMode(s,'L')+'|'+modePolicy.uiMode(s,'R');
 if(signature!==lastModeSignature){inputEpoch++;lastModeSignature=signature;if(['manual','handover','fallback'].includes(modePolicy.uiMode(s,'L')))keyboard.L=null;if($('physical-details'))$('physical-details').open=false;}
 if(s.mode==='manual'&&s.gear!=='P')pausePersonal('L');
 if(s.pending==='manual')pausePersonal('L');
 if(s.fallback){pausePersonal('L');pausePersonal('R')}
 const put=(id,value)=>{if($(id))$(id).textContent=value};
 const currentMode=modePolicy.uiMode(s,'L');
 document.body.dataset.inputMode=currentMode;
 const physicalSection=$('physical-section');
 const doors=physicalSection?.parentElement.querySelector('.doors-layout');
 if(doors&&currentMode==='l4'&&doors.nextElementSibling!==physicalSection){
  physicalSection.before(doors);
 }else if(doors&&currentMode!=='l4'&&physicalSection.nextElementSibling!==doors){
  doors.before(physicalSection);
 }
 put('mode-main',modePolicy.label(currentMode));
 put('channel-explanation',currentMode==='l4'?'门板触控处理乘员任务；实体安全键持续可达。':currentMode==='handover'?'恢复准备中，系统仍驾驶。请回位，在外部工具模拟就绪后独立确认。':currentMode==='manual'?'实体控件为主要通道；主驾门屏保留简短辅助任务，复杂编辑驻车后继续。':currentMode==='parked'?'人工驻车，可展开完整触控；实体控件保持可用。':'系统正在后备，必要安全入口持续可达。');
 put('takeover-progress',s.pending==='manual'?'回位：'+s.wheel+' · 人员/接口：'+(s.driverReady?'模拟已就绪':'待就绪')+' · 当前：系统控制':s.pending==='enable'?'启用请求待确认 · 当前：人工控制':'当前无待完成交权');
 for(const side of ['L','R'])put('door-mode-'+side,modePolicy.label(modePolicy.uiMode(s,side)));
 renderPhysical();
 put('summary-role',role()+(s.pending?' · 交接准备中':''));
 put('summary-wheel',s.wheel+' · '+s.phase);put('summary-speed',s.speed);put('summary-gear',s.gear);
 put('summary-nav',(s.nav?s.destination+' · '+(s.arrival===2?'已停稳':s.arrival===1?'接近目的地':s.detour?'600 m 后驶入沿江路':'800 m 后右转'):'导航已结束')+(s.stops.length?' · 经停 '+s.stops.join(' → '):'')+(s.shared?' · '+s.sharedBy+'分享：'+s.shared:''));
 put('summary-climate','主驾 '+s.temp+'°C / 副驾 '+s.rightTemp+'°C · '+(s.defog?'前除雾中':s.auto?'AUTO 自动风量':s.fan+' 档风量')+' · '+(s.circ?'内循环':'外循环'));
 put('summary-shared-media',(s.playing?'播放中':'已暂停')+' · '+s.tracks[s.track]+' · '+(s.mute?'媒体静音':'音量 '+s.volume));
 put('summary-media','副驾'+(s.people.R.activityPlaying?' · '+s.people.R.activity+'已打开':' · 暂无播放内容')+' · '+s.people.R.call);
 put('summary-safety',s.soc+'% 电量 · '+s.lights+' · '+s.turn+' · '+(s.hazard?'双闪开启 · ':'')+(s.doorClosed?'车门闭合':'右前门未闭合')+' · '+(s.belt?'已系安全带':'安全带未系好')+(s.tire!=='正常'?' · '+s.tire:''));
 const alert=s.fallback?s.notice:s.planned?s.notice:s.soc<=15?'模拟电量不足，可从任一门屏打开充电规划。':s.tire!=='正常'?'模拟左前胎压异常，请查看车辆健康信息。':!s.doorClosed?'右前门未闭合，起行条件待满足。':s.notice;
 put('summary-notice',alert||'系统运行信息会自动显示，无需打开任务');
 if($('summary-parking')){$('summary-parking').hidden=!s.parkingView;$('summary-parking').innerHTML=s.parkingView?'<strong>周边影像示意 · '+esc(s.gear)+' 挡</strong><div class="parking-view">╲　车体边界示意　╱</div><small>无真实传感器画面</small>':''}
 for(const area of ['L','C','R']){
  const item=zoneTasks[area];
  if(item){
   put('zone-title-'+area,item.id+' · '+tasks.find(t=>t.编号===item.id).任务或信息);
   if($('state-'+area)){ $('state-'+area).innerHTML=inDoor(item.side,()=>centralHTML(item.id));$('state-'+area).dataset.taskCard=item.id; }
  }
  if($('result-'+area)){put('result-'+area,feedback[area].text);$('result-'+area).dataset.feedbackSeq=feedback[area].seq}
 }
 const sceneName=s.fallback?'fault':s.planned?'planned':s.mode==='manual'?(s.gear==='R'?'parking':s.gear==='P'&&s.speed===0?'parked':'manual'):s.pending==='manual'?'handover':'l4';
 document.querySelectorAll('[data-scene]').forEach(b=>b.classList.toggle('active',b.dataset.scene===sceneName));
 for(const side of ['L','R'])renderDoor(side);
 if(selected){
  const t=tasks.find(t=>t.编号===selected),plan=layout[selected];
  if($('inspector'))$('inspector').innerHTML='<h3>'+selected+' · '+esc(t.任务或信息)+'</h3><p>门屏提供按钮，状态和结果位于中央'+({L:'左区',C:'中区',R:'右区'}[feedbackZone(selected,activeDoor)])+'。</p><p>'+esc(plan.actionDoors.length?'可操作侧：'+plan.actionDoors.map(zoneName).join(' / '):'纯展示任务，系统自动更新')+'</p>';
  if($('sim-actions'))$('sim-actions').innerHTML=(simMap[selected]||[]).map(([a,l])=>simbtn(a,l)).join('');
 }else{if($('inspector'))$('inspector').textContent='选择任务查看演示事件';if($('sim-actions'))$('sim-actions').innerHTML=''}
 if($('event-log'))$('event-log').innerHTML=logs.map(msg=>'<li>'+esc(msg)+'</li>').join('');
 renderLibrary();
}
function editText(side,command,char){
 activeDoor=side;const key=keyboard[side];if(!key)return;
 eventTask=fieldTasks[key];
 if(command==='done'){keyboard[side]=null;record(eventTask,'自定义文本输入结束，草稿显示在中央，请执行任务按钮提交');return}
 const next=command==='clear'?'':command==='backspace'?s[key].slice(0,-1):s[key]+char;
 setField(key,next);
}
document.addEventListener('pointerdown',e=>{
 const b=e.target.closest('button');
 pointerStart=b&&b.closest('.door-screen')?{button:b,epoch:inputEpoch}:null;
});
document.addEventListener('wheel',e=>{
 const knob=e.target.closest('[data-knob-field]');if(!knob)return;
 e.preventDefault();activeDoor=knob.closest('[data-door]').dataset.door;activeChannel='physical';eventTask=null;
 const key=knob.dataset.knobField;setField(key,Number(s[key])+(e.deltaY<0?1:-1)*fieldSpecs[key].step);
},{passive:false});
document.addEventListener('keydown',e=>{
 const knob=e.target.closest('[data-knob-field]');if(!knob)return;
 if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(e.key))return;
 e.preventDefault();activeDoor=knob.closest('[data-door]').dataset.door;activeChannel='physical';eventTask=null;
 if(e.key==='Enter'){if(knob.dataset.press)act(knob.dataset.press);return}
 const key=knob.dataset.knobField;setField(key,Number(s[key])+(['ArrowUp','ArrowRight'].includes(e.key)?1:-1)*fieldSpecs[key].step);
});
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled||!b.isConnected)return;
 const side=b.closest('[data-door]')?.dataset.door;eventTask=null;
 activeChannel=b.closest('[data-channel]')?.dataset.channel||'touch';
 if(activeChannel==='touch'&&b.closest('.door-screen')&&e.detail>0&&pointerStart&&(pointerStart.button!==b||pointerStart.epoch!==inputEpoch)){pointerStart=null;activeDoor=side||'L';record('A01','布局已随驾驶状态更新，请重新触控；原按压未执行');return}
 pointerStart=null;
 if(b.dataset.explain){activeDoor=side||'L';record(b.dataset.explain,modePolicy.reason(b.dataset.explain,s,activeDoor,'touch')||'这是系统信息，中央会自动更新');return}
 if(b.dataset.locatePhysical){activeDoor=side||'L';record(b.dataset.locatePhysical,'已定位实体控件模拟区，请使用相应实体入口');const group=document.querySelector('#physical-section [data-physical-task~="'+b.dataset.locatePhysical+'"]');const details=group?.closest('details');if(details)details.open=true;group?.scrollIntoView({block:'center',behavior:'auto'});return}
 if(b.dataset.cycleField&&side){activeDoor=side;const key=b.dataset.cycleField,options=fieldSpecs[key].choices;setField(key,options[(options.indexOf(s[key])+1)%options.length]);return}
 if(b.dataset.open){openTask(b.dataset.open,b.dataset.doorTarget||side);return}
 if(side)activeDoor=side;
 if(b.dataset.doorGroup&&side){doorGroups[side]=b.dataset.doorGroup;renderDoor(side);return}
 if(b.dataset.field&&side){
  const key=b.dataset.field,value=b.hasAttribute('data-delta')?Number(s[key])+Number(b.dataset.delta):b.dataset.value;
  setField(key,value);return;
 }
 if(b.dataset.keyboard&&side){
  const key=b.dataset.keyboard;if(!canAct(fieldTasks[key]))return denied(fieldTasks[key]);
  const restriction=modePolicy.reason(fieldTasks[key],s,side,'touch','text');if(restriction){record(fieldTasks[key],restriction);return}
  keyboard[side]=key;eventTask=fieldTasks[key];record(eventTask,'自定义输入已打开：使用门屏字母按键，草稿显示在中央对应区域');return;
 }
 if(b.hasAttribute('data-key')&&side){editText(side,'append',b.dataset.key);return}
 if(b.dataset.edit&&side){editText(side,b.dataset.edit,'');return}
 if(b.dataset.action&&side){act(b.dataset.action);return}
 if(b.dataset.sim){
  if(side){if(!['turn-left','turn-right'].includes(b.dataset.sim)||!canAct('B03'))return denied('B03');eventTask='B03';const restriction=modePolicy.reason('B03',s,side,activeChannel);if(restriction){record('B03',restriction);return}}
  if(b.dataset.sim==='horn'){s.hornCount++;record('B11','鸣笛演示 '+s.hornCount+' 次');return}
  sim(b.dataset.sim);return;
 }
 if(b.dataset.scene){scene(b.dataset.scene);return}
 if(b.hasAttribute('data-group')){group=b.dataset.group;renderLibrary();return}
 if(b.hasAttribute('data-reset')||b.id==='reset'){reset();return}
 if(b.hasAttribute('data-clear-filters')||b.id==='clear-filters'){clearFilters();return}
});
document.addEventListener('keydown',e=>{
 if(!keyboard[activeDoor]||e.target.closest('input,select,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.key==='Backspace'){e.preventDefault();editText(activeDoor,'backspace','')}
 else if(e.key==='Escape'){e.preventDefault();editText(activeDoor,'done','')}
 else if(e.key.length===1){e.preventDefault();editText(activeDoor,'append',e.key)}
});
for(const id of ['search','filter-type','filter-freq','filter-actor'])$(id)?.addEventListener(id==='search'?'input':'change',renderLibrary);
if($('group-nav'))$('group-nav').innerHTML='<button data-group="" class="active">全部 72</button>'+Object.entries(names).map(([key,label])=>'<button data-group="'+key+'">'+key+' '+label+'</button>').join('');
function clearFilters(){group='';for(const id of ['search','filter-type','filter-freq','filter-actor'])if($(id))$(id).value='';renderLibrary()}
function reset(){
 activeDoor='L';activeChannel='touch';s=makeState();selected=null;eventTask=null;doorSelections={L:'A01',R:'D07'};doorGroups={L:'C',R:'D'};keyboard={L:null,R:null};logs=[];changeCount=0;
 zoneTasks={L:{id:'A01',side:'L'},C:{id:'C01',side:'L'},R:{id:'D07',side:'R'}};
 feedback={L:{seq:0,text:'驾驶任务反馈'},C:{seq:0,text:'共享任务反馈'},R:{seq:0,text:'副驾任务反馈'}};
 resetVisuals();clearFilters();render();
}
window.demo={
 getState:()=>JSON.parse(JSON.stringify(s)),
 getUiMode:(side='L')=>modePolicy.uiMode(s,side),
 getInputPolicy:(id,side='L',channel='touch')=>({allowed:!!layout[id]?.actionDoors.includes(side)&&!modePolicy.reason(id,s,side,channel),reason:modePolicy.reason(id,s,side,channel)}),
 getSelected:()=>selected,getChangeCount:()=>changeCount,
 taskIds:()=>tasks.map(t=>t.编号),getZone:feedbackZone,getFeedbackZone:feedbackZone,
 getFeedbackCounts:()=>Object.fromEntries(Object.entries(feedback).map(([key,value])=>[key,value.seq])),
 getFeedback:()=>JSON.parse(JSON.stringify(feedback)),
 openTask:(id,side)=>openTask(id,side,false),reset,selectScene:scene,
 getDoorSelections:()=>({...doorSelections}),getLayout:()=>JSON.parse(JSON.stringify(window.DOOR_LAYOUT)),
 snapshot:()=>({state:JSON.parse(JSON.stringify(s)),selected,doorSelections:{...doorSelections},changeCount})
};
if(tasks.length!==72||new Set(tasks.map(t=>t.编号)).size!==72||Object.keys(layout).length!==72)throw Error('Task inventory incomplete');
for(const t of tasks){if(!layout[t.编号])throw Error('Missing door task: '+t.编号);for(const side of layout[t.编号].doors)inDoor(side,()=>body(t.编号))}
scene('l4');
