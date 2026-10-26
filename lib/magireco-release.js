const METADATA_ROOT = 'https://magireco-personal-release.pages.dev/';
const REPO_API = 'https://api.github.com/repos/HiiragiNemu/ProgettoMagius-1';
const RELEASE_ROOT = 'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/';
// One product, one release line. Upstream aliases may carry the same APK, but
// the website selects only current; the fixed 1.1.11 bridge is not a fallback.
const METADATA_NAME = 'magireco-current-legacy-client.version.json';
// Keep GitHub latest canonical; the only optional second route is relay current.
// It is NOT the relay's same-named fixed 1.1.11 bridge.
const APK_NAME = 'magireco-latest-legacy-client.apk';
const RELAY_CURRENT_APK_URL = METADATA_ROOT + 'magireco-current-legacy-client.apk';

// Public update key pinned by the existing APK; no private key or runtime override.
const UPDATE_KEY = { kty:'RSA', e:'AQAB', n:"zeaF1ZAWqvujjt3Jl_3PZPaGmU7iADdYqT-W425LNbqTcbprtcMC792qFCo-1VngMKr4wtSNPQI7kZSht6pW500okFfytoyqQ6wkx5MuAkoyUeCI4PjbRRbG2anvYyxJXi5hpDy5gtUeO_kseKm7ZOMAmBzBeE7oIogNEXWPHDfCU6G0UbN9GMqKrcvdJ6yibGWTBYlpPp2E8qhcdnR9SmGgbQvZ_g_XRnWoe8-wF0bKsBrtug-WGIY3oPuEly1pcsCnw_iExEltM51C6gWnUvrYWqGEykC-qAbLHAxHOzXbrd3glm96d6qhioKMSmxUZGvAod2OsCK-BCBcIBHo_v7F1U0vBoslmx497uD1byPVgD8cB-ETLzj29CMg5EivSR0ISXBLuN9FdvHXqmLr-6q4pa0fmQXDuRGQ1RdG2DUyvw6Xt8VO68WH6ysjaDvjAvLzFk96-yjj4FfjW_VKXB9a8NsvllD6SGg-Cu-AweeajaNHqD22cCEAd2PglB6X" };
const DISCOVERY_MIGRATION = {
  "schema": 2,
  "mode": "true-1.2-single-apk",
  "from": {
    "version": "1.3.4",
    "version_code": 1713000858,
    "size": 462325970,
    "sha256": "e2fb1e34f87e95ac5cb5a20f9f60e7e9fd745510805d644d8cd3bcb1aa0e70f9",
    "source_commit": "4a1d01f4599927a889a015dc217f79e7fb0c75d8"
  },
  "to_line": "1.2",
  "minimum_version": "1.2.7",
  "minimum_code": 1713000869,
  "old_1_3_manual_install_once": false,
  "legacy_discovery": {
    "version": "1.3.127",
    "display_version": "1.2.7"
  }
};

// Bind only after the producer freezes the officially signed APK/GPL/migration identity.
// No environment, request or downloaded-metadata override is accepted.
const RELEASE_128_CONTRACT = {"version":"1.3.128","display_version":"1.2.8","version_code":1713000880,"sha256":"6c9a3041cd1e51a40c1d154bd41680378608f5163e13e337bbd1a406e70b313a","size":463101260,"source_commit":"7df8930fe6bcb1d0f9aee0ecd22a761e98f675b6","corresponding_source":{"asset":"magireco-legacy-client-1.2.8-corresponding-source.zip","sha256":"4ea61ccfd67edb50551f31b956b31cd55a6e51b93e34b5ebea29b54106c7269e","size":126460466},"single_line_migration":{"schema":2,"mode":"true-1.2-single-apk","minimum_version":"1.2.8","to_line":"1.2","legacy_discovery":{"display_version":"1.2.8","version":"1.3.128"},"old_1_3_manual_install_once":false,"from":{"source_commit":"4a1d01f4599927a889a015dc217f79e7fb0c75d8","size":462325970,"sha256":"e2fb1e34f87e95ac5cb5a20f9f60e7e9fd745510805d644d8cd3bcb1aa0e70f9","version_code":1713000858,"version":"1.3.4"},"minimum_code":1713000880},"release_notes":["实际安装版本：1.2.8；1.3.128仅为旧版检查更新的兼容发现序号。同签名覆盖更新保留档案与资源标记，已完整安装的固定资源无需重新下载。","优化结算504相关超时预算与重复回执处理，减少重复整档读取和序列化。","修复切换属性分页选择关卡NPC助战时的409，并兼容已完成新手流程但遗失旧标记的档案。","修复属性强化材料名称与消耗数量的配对，保留材料不足、扣除及重复操作校验。","修复全解锁档的记忆结晶库存显示与容量同步，普通档不增发库存。","修复无限购商品购买后的累计购买数、库存与持有数刷新，保留限购及跨月重置规则。","将已选卡图和行动盘外观传递到原生战斗，保留角色实际星级、等级与战斗数值。","支持按档案选择活动类型与期次，补入35期登录剧情及2036心魔战和商店。"]};

// Preparation only: bind the final officially signed 1.2.9 identity before publishing.
const RELEASE_129_CONTRACT = {"version":"1.3.129","display_version":"1.2.9","version_code":1713000881,"sha256":"a64d904c87ddcdf3650671d1f45e860fd259cd185322e9243ae5543f77bce00d","size":482962666,"source_commit":"2a6cac8e1f5d2beffe85139989e698ca523483c6","corresponding_source":{"asset":"magireco-legacy-client-1.2.9-corresponding-source.zip","sha256":"fb99a29d4463c13a4b26ff2d87bcd3a5b86ba7cdc614d6acb457c77c41844cef","size":199209905},"single_line_migration":{"schema":2,"mode":"true-1.2-single-apk","minimum_version":"1.2.9","to_line":"1.2","legacy_discovery":{"display_version":"1.2.9","version":"1.3.129"},"old_1_3_manual_install_once":false,"from":{"source_commit":"4a1d01f4599927a889a015dc217f79e7fb0c75d8","size":462325970,"sha256":"e2fb1e34f87e95ac5cb5a20f9f60e7e9fd745510805d644d8cd3bcb1aa0e70f9","version_code":1713000858,"version":"1.3.4"},"minimum_code":1713000881},"release_notes":["实际安装版本：1.2.9；1.3.129仅为旧版检查更新的兼容发现序号。覆盖安装保留存档与已安装资源，无需卸载。","修复升级、材料兑换、编队保存及巡逻等操作因执行时间限制而出现的504，保留已完成操作的重试回执，避免重复扣除。","降低全解锁档和图鉴魔法少女页面的响应内存峰值，保留完整角色与库存数据。","减少页面切换、编队和战斗入口的重复计算，不缩短请求超时。","修复部分活动战斗消耗魔法石复活时的409，兼容更新前未结束的战斗，重试不重复扣石。","修复全解锁档部分章节与关卡完成标记不一致导致的409，保留首通奖励状态。","修复商店限购数量跨期刷新和记忆结晶编队保存后的显示。","修复角色个人介绍中的换行控制符显示，保留现有中文文本。"]};

// Bind the final signed 1.3.0 identity before enabling this discovery version.
const RELEASE_130_CONTRACT = {"version":"1.3.130","display_version":"1.3.0","version_code":1713000882,"sha256":"5b93620c0fcde2ecde5e90c594496a93622a17667b974a25c85660fae0238c83","size":503684194,"source_commit":"5048f5373821780daba95ee5049fc4856b5a1aa8","corresponding_source":{"asset":"magireco-legacy-client-1.3.0-corresponding-source.zip","sha256":"f3f47aca644712eb213111e0a5de80c57c1e6bd8a90d5b98674ed6bac4499cbc","size":607116260},"single_line_migration":{"schema":2,"mode":"true-1.2-single-apk","minimum_version":"1.3.0","to_line":"1.2","legacy_discovery":{"display_version":"1.3.0","version":"1.3.130"},"old_1_3_manual_install_once":false,"from":{"source_commit":"4a1d01f4599927a889a015dc217f79e7fb0c75d8","size":462325970,"sha256":"e2fb1e34f87e95ac5cb5a20f9f60e7e9fd745510805d644d8cd3bcb1aa0e70f9","version_code":1713000858,"version":"1.3.4"},"minimum_code":1713000882},"release_notes":["实际安装版本：1.3.0；1.3.130为兼容旧版检查更新的发现序号。覆盖安装保留存档和已安装资源，无需卸载。","修复部分档案容量过大时战斗、巡逻和普通扭蛋请求失败的问题，以及未完成普通战斗期间保存后续编队时的请求冲突；保留费用和重复提交校验。","修复未完成战斗恢复时的数据衔接，保留已扣费用和关卡进度。","调整部分活动在战斗期与兑换期的入口衔接，保留原有开放时间和战斗限制。","补充部分塔型活动关卡的固定助战配置。"]};

// Local preparation only: bind the final officially signed APK/source identity before deployment.
const RELEASE_131_CONTRACT = {"version":"1.3.131","display_version":"1.3.1","version_code":1713000883,"sha256":"74c41cfd33d6250addbb73e55fee98eae43cf3f39591cfde2d055b4790c40cba","size":504003682,"source_commit":"b53edacccb5789a02efd7ea7c5dbd49f1337bdf7","corresponding_source":{"asset":"magireco-legacy-client-1.3.1-corresponding-source.zip","sha256":"dcc43a2e381e0ba599942819cd5bb423f9ce5ed8c6f26efe8811b959e7da47cc","size":610958166},"single_line_migration":{"schema":2,"mode":"true-1.2-single-apk","minimum_version":"1.3.1","to_line":"1.2","legacy_discovery":{"display_version":"1.3.1","version":"1.3.131"},"old_1_3_manual_install_once":false,"from":{"source_commit":"4a1d01f4599927a889a015dc217f79e7fb0c75d8","size":462325970,"sha256":"e2fb1e34f87e95ac5cb5a20f9f60e7e9fd745510805d644d8cd3bcb1aa0e70f9","version_code":1713000858,"version":"1.3.4"},"minimum_code":1713000883},"release_notes":["实际安装版本：1.3.1；1.3.131为兼容旧客户端的更新发现序号。覆盖安装保留存档与已安装资源，无需卸载。","镜层与心魔入口取消独立关闭选项；旧档案中的关闭选择恢复为跟随档案时间，档期未开放时仍保持原开放条件。常驻默认与已保存的手动入口保留。","恢复旧格式档案的镜层、心魔常驻默认选择；未解锁时可先保存常驻偏好，并显示所需主线条件。已保存的手动选择保持不变。","修复切换历史活动后旧限时任务定义丢失、导致首页及其他入口报错的问题；保留原任务进度与奖励。","活动与卡池筛选按钮自适应排列，消除中间大块留白，保留字号和按钮高度。","修复角色复活后战斗结算409，以及付费续关后丢失战斗现场、恢复再结算时的计数冲突；保留已扣费用与重复提交校验。","补齐结果页所需的助战资料，修复相关结算页面异常；补全角色剧情的主线前置条件提示。","资源和热更新下载跟随系统代理，备用下载引擎同步采用所选代理；保留分片、断点续传与完整性校验。","延长启动切换的排队等待，修复设备繁忙时进入本地游玩失败的问题。","完善游玩日志的默认记录、跨重启保留与导出，优化更新提示和版本检查。","修正部分镜界排行商店数据及原生界面文字、自动设置显示。"]};

function sameJson(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a).sort(), bk = Object.keys(b).sort();
  return ak.length === bk.length && ak.every((key, i) => key === bk[i] && sameJson(a[key], b[key]));
}

async function verifiedDiscoveryPayload(envelope) {
  if (!envelope || !sameJson(Object.keys(envelope).sort(), ['key_id','payload','schema','signature']) ||
      envelope.schema !== 1 || envelope.key_id !== 'release-manifest-v1' ||
      typeof envelope.payload !== 'string' || typeof envelope.signature !== 'string' ||
      !/^[a-f0-9]{768}$/.test(envelope.signature)) throw new Error('Invalid discovery envelope');
  const raw = new TextEncoder().encode(envelope.payload);
  if (raw.byteLength > 65536) throw new Error('Discovery payload is too large');
  const key = await crypto.subtle.importKey('jwk', UPDATE_KEY,
    { name:'RSASSA-PKCS1-v1_5', hash:'SHA-256' }, false, ['verify']);
  const signature = Uint8Array.from(envelope.signature.match(/../g), byte => parseInt(byte, 16));
  const message = new TextEncoder().encode('MAGIACN-APK-UPDATE-V1\n' + envelope.payload);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, message)) throw new Error('Invalid publisher signature');
  const payload = JSON.parse(envelope.payload);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid discovery payload');
  return payload;
}

function bound128Contract(client, payload) {
  const contract = RELEASE_128_CONTRACT;
  const fields = ['version','display_version','version_code','sha256','size','source_commit',
                  'corresponding_source','single_line_migration','release_notes'];
  if (!contract || !sameJson(Object.keys(contract).sort(), [...fields].sort()) || contract.version !== '1.3.128' || contract.display_version !== '1.2.8' ||
      contract.version_code !== 1713000880 || !/^[a-f0-9]{64}$/.test(contract.sha256 || '') ||
      !Number.isSafeInteger(contract.size) || contract.size <= 0 || contract.size > 1073741824 ||
      !/^[a-f0-9]{40}$/.test(contract.source_commit || '') ||
      !contract.single_line_migration || typeof contract.single_line_migration !== 'object' || Array.isArray(contract.single_line_migration) ||
      !sameJson(Object.keys(contract.single_line_migration).sort(), Object.keys(DISCOVERY_MIGRATION).sort()) ||
      !contract.single_line_migration.from ||
      !sameJson(Object.keys(contract.single_line_migration.from).sort(), Object.keys(DISCOVERY_MIGRATION.from).sort()) ||
      !contract.single_line_migration.legacy_discovery ||
      !sameJson(Object.keys(contract.single_line_migration.legacy_discovery).sort(), ['display_version','version']) ||
      !Array.isArray(contract.release_notes) || contract.release_notes.length === 0 || contract.release_notes.some(note => typeof note !== 'string' || !note) ||
      contract.corresponding_source?.asset !== 'magireco-legacy-client-1.2.8-corresponding-source.zip' ||
      !sameJson(Object.keys(contract.corresponding_source).sort(), ['asset','sha256','size']) ||
      !/^[a-f0-9]{64}$/.test(contract.corresponding_source.sha256 || '') ||
      !Number.isSafeInteger(contract.corresponding_source.size) || contract.corresponding_source.size <= 0) {
    throw new Error('128 release identity is not frozen and bound');
  }
  for (const field of fields) {
    if (!sameJson(client[field], payload[field]) ||
        (field !== 'corresponding_source' && !sameJson(payload[field], contract[field]))) {
      throw new Error('128 release contract mismatch: ' + field);
    }
  }
  for (const field of ['asset','sha256','size']) {
    if (!sameJson(payload.corresponding_source?.[field], contract.corresponding_source[field])) {
      throw new Error('128 GPL contract mismatch: ' + field);
    }
  }
  return contract;
}


function bound129Contract(client, payload) {
  const contract = RELEASE_129_CONTRACT;
  const fields = ['version','display_version','version_code','sha256','size','source_commit',
                  'corresponding_source','single_line_migration','release_notes'];
  const migration = { ...DISCOVERY_MIGRATION, minimum_version:'1.2.9', minimum_code:contract?.version_code,
    legacy_discovery:{version:'1.3.129',display_version:'1.2.9'} };
  if (!contract || !sameJson(Object.keys(contract).sort(), [...fields].sort()) ||
      contract.version !== '1.3.129' || contract.display_version !== '1.2.9' ||
      contract.version_code !== 1713000881 ||
      !/^[a-f0-9]{64}$/.test(contract.sha256 || '') || !Number.isSafeInteger(contract.size) || contract.size <= 0 || contract.size > 1073741824 ||
      !/^[a-f0-9]{40}$/.test(contract.source_commit || '') || !sameJson(contract.single_line_migration,migration) ||
      !Array.isArray(contract.release_notes) || contract.release_notes.length === 0 || contract.release_notes.some(note => typeof note !== 'string' || !note) ||
      contract.corresponding_source?.asset !== 'magireco-legacy-client-1.2.9-corresponding-source.zip' ||
      !sameJson(Object.keys(contract.corresponding_source).sort(), ['asset','sha256','size']) ||
      !/^[a-f0-9]{64}$/.test(contract.corresponding_source.sha256 || '') ||
      !Number.isSafeInteger(contract.corresponding_source.size) || contract.corresponding_source.size <= 0) {
    throw new Error('129 release identity is not frozen and bound');
  }
  for (const field of fields) {
    if (!sameJson(client[field],payload[field]) ||
        (field !== 'corresponding_source' && !sameJson(payload[field],contract[field]))) {
      throw new Error('129 release contract mismatch: ' + field);
    }
  }
  for (const field of ['asset','sha256','size']) {
    if (!sameJson(payload.corresponding_source?.[field],contract.corresponding_source[field])) {
      throw new Error('129 GPL contract mismatch: ' + field);
    }
  }
  return contract;
}

function bound130Contract(client, payload) {
  const contract = RELEASE_130_CONTRACT;
  const fields = ['version','display_version','version_code','sha256','size','source_commit',
                  'corresponding_source','single_line_migration','release_notes'];
  const migration = { ...DISCOVERY_MIGRATION, minimum_version:'1.3.0', minimum_code:contract?.version_code,
    legacy_discovery:{version:'1.3.130',display_version:'1.3.0'} };
  if (!contract || !sameJson(Object.keys(contract).sort(), [...fields].sort()) ||
      contract.version !== '1.3.130' || contract.display_version !== '1.3.0' ||
      contract.version_code !== 1713000882 ||
      !/^[a-f0-9]{64}$/.test(contract.sha256 || '') || !Number.isSafeInteger(contract.size) || contract.size <= 0 || contract.size > 1073741824 ||
      !/^[a-f0-9]{40}$/.test(contract.source_commit || '') || !sameJson(contract.single_line_migration,migration) ||
      !Array.isArray(contract.release_notes) || contract.release_notes.length === 0 || contract.release_notes.some(note => typeof note !== 'string' || !note) ||
      contract.corresponding_source?.asset !== 'magireco-legacy-client-1.3.0-corresponding-source.zip' ||
      !sameJson(Object.keys(contract.corresponding_source).sort(), ['asset','sha256','size']) ||
      !/^[a-f0-9]{64}$/.test(contract.corresponding_source.sha256 || '') ||
      !Number.isSafeInteger(contract.corresponding_source.size) || contract.corresponding_source.size <= 0) {
    throw new Error('130 release identity is not frozen and bound');
  }
  for (const field of fields) {
    if (!sameJson(client[field],payload[field]) ||
        (field !== 'corresponding_source' && !sameJson(payload[field],contract[field]))) {
      throw new Error('130 release contract mismatch: ' + field);
    }
  }
  for (const field of ['asset','sha256','size']) {
    if (!sameJson(payload.corresponding_source?.[field],contract.corresponding_source[field])) {
      throw new Error('130 GPL contract mismatch: ' + field);
    }
  }
  return contract;
}

function bound131Contract(client, payload) {
  const contract = RELEASE_131_CONTRACT;
  const fields = ['version','display_version','version_code','sha256','size','source_commit',
                  'corresponding_source','single_line_migration','release_notes'];
  const migration = { ...DISCOVERY_MIGRATION, minimum_version:'1.3.1', minimum_code:contract?.version_code,
    legacy_discovery:{version:'1.3.131',display_version:'1.3.1'} };
  if (!contract || !sameJson(Object.keys(contract).sort(), [...fields].sort()) ||
      contract.version !== '1.3.131' || contract.display_version !== '1.3.1' ||
      contract.version_code !== 1713000883 ||
      !/^[a-f0-9]{64}$/.test(contract.sha256 || '') || !Number.isSafeInteger(contract.size) || contract.size <= 0 || contract.size > 1073741824 ||
      !/^[a-f0-9]{40}$/.test(contract.source_commit || '') || !sameJson(contract.single_line_migration,migration) ||
      !Array.isArray(contract.release_notes) || contract.release_notes.length === 0 || contract.release_notes.some(note => typeof note !== 'string' || !note) ||
      contract.corresponding_source?.asset !== 'magireco-legacy-client-1.3.1-corresponding-source.zip' ||
      !sameJson(Object.keys(contract.corresponding_source).sort(), ['asset','sha256','size']) ||
      !/^[a-f0-9]{64}$/.test(contract.corresponding_source.sha256 || '') ||
      !Number.isSafeInteger(contract.corresponding_source.size) || contract.corresponding_source.size <= 0) {
    throw new Error('131 release identity is not frozen and bound');
  }
  for (const field of fields) {
    if (!sameJson(client[field],payload[field]) ||
        (field !== 'corresponding_source' && !sameJson(payload[field],contract[field]))) {
      throw new Error('131 release contract mismatch: ' + field);
    }
  }
  for (const field of ['asset','sha256','size']) {
    if (!sameJson(payload.corresponding_source?.[field],contract.corresponding_source[field])) {
      throw new Error('131 GPL contract mismatch: ' + field);
    }
  }
  return contract;
}

// Current132 binding is intentionally absent until producer-qualified staging.
const RELEASE_132_CONTRACT = {"version":"1.3.132","display_version":"1.3.2","version_code":1713000885,"sha256":"8ac0722cda21a724e6d807a0564173a94cf375b6ada7fe48562aa8dd44187b32","size":504141253,"source_commit":"761a993c67dfc195308a9be0349c8611d8fac953","corresponding_source":{"asset":"magireco-legacy-client-1.3.2-corresponding-source.zip","sha256":"421f82c0b4ed45fb0f6d28bde9073c7147c6ac796a74597cde0affe84e35172d","size":611496894},"single_line_migration":{"schema":2,"mode":"true-1.2-single-apk","minimum_version":"1.3.2","to_line":"1.2","legacy_discovery":{"display_version":"1.3.2","version":"1.3.132"},"old_1_3_manual_install_once":false,"from":{"source_commit":"4a1d01f4599927a889a015dc217f79e7fb0c75d8","size":462325970,"sha256":"e2fb1e34f87e95ac5cb5a20f9f60e7e9fd745510805d644d8cd3bcb1aa0e70f9","version_code":1713000858,"version":"1.3.4"},"minimum_code":1713000885},"release_notes":["实际安装版本：1.3.2；1.3.132为兼容旧客户端的更新发现序号。覆盖安装保留存档与已安装资源。","修复旧档限时任务资料不完整引起的首页异常；调整战斗恢复确认和明确放弃流程，保留未成功放弃的战斗现场与已扣费用。","补齐第5章已核实关卡的结算数据，修正百祸挑战同分区错误前置条件，保留普通挑战和跨分区的原有门槛。","恢复部分活动的原版入口图片和已核实的选关角色；保留现有中文图片及原始剧情文本。","补入首次环彩羽特训的14项累计任务，按实际完成次数记录进度，并防止重复结算或领奖。","筛选按钮随可用宽度铺满整行；压缩游玩日志顶部及按钮留白，扩大日志正文区域；调整长关卡标题显示。","修正取消下载后的任务锁释放和首次连接失败的重试衔接，保留断点续传与完整性校验。","修正已通关关卡的自动战斗开关，普通AUTO不再误用三任务全完成门槛；自动周回继续按原条件判断。","恢复6家历史活动商店的259项商品及对应时间和库存，补齐两期活动共92个关卡的缺失代币掉落。","修复阿莉娜工作室3期活动的可能性因子扭蛋图标路径，使用同活动原始图标。","纳入resource54已核实的角色台词名称修订。"]};

function bound132Contract(client, payload) {
  const contract = RELEASE_132_CONTRACT;
  const fields = ['version','display_version','version_code','sha256','size','source_commit',
                  'corresponding_source','single_line_migration','release_notes'];
  const migration = { ...DISCOVERY_MIGRATION, minimum_version:'1.3.2', minimum_code:contract?.version_code,
    legacy_discovery:{version:'1.3.132',display_version:'1.3.2'} };
  if (!contract || !sameJson(Object.keys(contract).sort(), [...fields].sort()) ||
      contract.version !== '1.3.132' || contract.display_version !== '1.3.2' ||
      contract.version_code !== 1713000885 ||
      !/^[a-f0-9]{64}$/.test(contract.sha256 || '') || !Number.isSafeInteger(contract.size) || contract.size <= 0 || contract.size > 1073741824 ||
      !/^[a-f0-9]{40}$/.test(contract.source_commit || '') || !sameJson(contract.single_line_migration,migration) ||
      !Array.isArray(contract.release_notes) || contract.release_notes.length === 0 || contract.release_notes.some(note => typeof note !== 'string' || !note) ||
      contract.corresponding_source?.asset !== 'magireco-legacy-client-1.3.2-corresponding-source.zip' ||
      !sameJson(Object.keys(contract.corresponding_source).sort(), ['asset','sha256','size']) ||
      !/^[a-f0-9]{64}$/.test(contract.corresponding_source.sha256 || '') ||
      !Number.isSafeInteger(contract.corresponding_source.size) || contract.corresponding_source.size <= 0) {
    throw new Error('132 release identity is not frozen and bound');
  }
  for (const field of fields) {
    if (!sameJson(client[field],payload[field]) ||
        (field !== 'corresponding_source' && !sameJson(payload[field],contract[field]))) {
      throw new Error('132 release contract mismatch: ' + field);
    }
  }
  for (const field of ['asset','sha256','size']) {
    if (!sameJson(payload.corresponding_source?.[field],contract.corresponding_source[field])) {
      throw new Error('132 GPL contract mismatch: ' + field);
    }
  }
  return contract;
}

async function releaseVersion(client, payload) {
  const discoveryFields = ['display_version', 'compatibility_discovery'];
  const hasDiscovery = discoveryFields.some(field => Object.hasOwn(client, field) || (payload && Object.hasOwn(payload, field)));
  if (!hasDiscovery) {
    const patch = /^1\.2\.(\d+)$/.exec(client.version || '');
    if (!patch || Number(patch[1]) >= 8 || client.version_code > 1713000870) throw new Error('Future releases require a bound signed discovery identity');
    return client.version;
  }
  const signed = await verifiedDiscoveryPayload(client.signed_update);
  const is128 = signed.version === '1.3.128';
  const is129 = signed.version === '1.3.129';
  const is130 = signed.version === '1.3.130';
  const is131 = signed.version === '1.3.131';
  const is132 = signed.version === '1.3.132';
  const bound = is132 ? bound132Contract(client, signed) : is131 ? bound131Contract(client, signed) : is130 ? bound130Contract(client, signed) : is129 ? bound129Contract(client, signed) : is128 ? bound128Contract(client, signed) : null;
  const discovery = is132 ? '1.3.132' : is131 ? '1.3.131' : is130 ? '1.3.130' : is129 ? '1.3.129' : is128 ? '1.3.128' : '1.3.127';
  const display = is132 ? '1.3.2' : is131 ? '1.3.1' : is130 ? '1.3.0' : is129 ? '1.2.9' : is128 ? '1.2.8' : '1.2.7';
  const migration = bound ? bound.single_line_migration : DISCOVERY_MIGRATION;
  for (const field of ['display_version','compatibility_discovery','single_line_migration']) {
    if (!sameJson(client[field], signed[field])) throw new Error('Unsigned discovery field: ' + field);
  }
  const mapping = signed.compatibility_discovery;
  if (signed.version !== discovery || signed.display_version !== display ||
      !mapping || Array.isArray(mapping) || mapping.schema !== 1 ||
      mapping.discovery_version !== discovery || mapping.installed_public_version !== display ||
      !Number.isSafeInteger(signed.version_code) || signed.version_code <= 1713000868 || signed.version_code > 2147483647 || (!is128 && !is129 && !is130 && !is131 && !is132 && signed.version_code > 1713000870) ||
      mapping.installed_version_code !== signed.version_code || mapping.same_published_apk !== true || mapping.separate_client_release !== false ||
      !sameJson(signed.single_line_migration, migration) ||
      !Array.isArray(signed.release_notes) || typeof signed.release_notes[0] !== 'string' ||
      !signed.release_notes[0].startsWith('实际安装版本：' + display) || !Array.from(signed.release_notes[0]).slice(0,160).join('').includes(discovery)) {
    throw new Error('Invalid explicit single-APK discovery mapping');
  }
  // release_version is the signed discovery identity, never a display override.
  for (const value of [signed.release_version, client.release_version]) {
    if (value !== undefined && value !== signed.version) throw new Error('Invalid release identity');
  }
  if (Object.hasOwn(client, 'release_version') && !Object.hasOwn(signed, 'release_version')) throw new Error('Unsigned release identity');
  for (const field of ['publisher','channel','package_name','source_commit','legacy_cert_sha256','release_cert_sha256','corresponding_source','apk_urls']) {
    if (!sameJson(client[field], signed[field])) throw new Error('Unsigned publisher identity: ' + field);
  }
  if (signed.publisher !== 'MadeInMagius' || signed.channel !== 'personal-1.1' ||
      signed.package_name !== 'io.kamihama.totentanz' || !/^[a-f0-9]{40}$/.test(signed.source_commit || '') ||
      signed.legacy_cert_sha256 !== 'a40da80a59d170caa950cf15c18c454d47a39b26989d8b640ecd745ba71bf5dc' ||
      signed.release_cert_sha256 !== '73b6fa55f2792a437fcc186cce529d1288b231ae43acfb0137068cd12b381705' ||
      signed.size > 1073741824 ||
      ['legacy_compatibility','upgrade_bridge'].some(field => Object.hasOwn(client, field) || Object.hasOwn(signed, field)) ||
      signed.corresponding_source?.asset !== 'magireco-legacy-client-' + display + '-corresponding-source.zip' ||
      !/^[a-f0-9]{64}$/.test(signed.corresponding_source.sha256 || '') ||
      !Number.isSafeInteger(signed.corresponding_source.size) || signed.corresponding_source.size <= 0) throw new Error('Invalid publisher identity');
  return signed.display_version;
}

function validClient(client) {
  const version = /^1\.2\.(\d+)$/.exec(client?.version || '');
  const acceptedVersion = (version && Number.isSafeInteger(Number(version[1])) && Number(version[1]) >= 5) ||
    (client?.version === '1.3.0' && client.version_code === 1713000882) ||
    (client?.version === '1.3.1' && client.version_code === 1713000883) ||
    (client?.version === '1.3.2' && client.version_code === 1713000885);
  return client && acceptedVersion &&
    Number.isSafeInteger(client.version_code) && client.version_code > 1713000864 &&
    /^[a-f0-9]{64}$/.test(client.sha256 || '') && Number.isSafeInteger(client.size) && client.size > 0;
}

function matchAsset(release, client, name) {
  if (!validClient(client) || !Array.isArray(release.assets)) return null;
  const assets = release.assets.filter(asset => asset?.name === name);
  if (assets.length !== 1) return null;
  const apk = assets[0];
  return Number.isSafeInteger(apk.id) && apk.id > 0 && apk.state === 'uploaded' &&
    apk.size === client.size && apk.digest === 'sha256:' + client.sha256 ? apk : null;
}

function validApkUrls(urls) {
  const canonical = RELEASE_ROOT + APK_NAME;
  return sameJson(urls, [canonical]) || sameJson(urls, [canonical, RELAY_CURRENT_APK_URL]);
}

async function currentAsset(release, current) {
  if (!current || current.apk !== APK_NAME || current.apk_url !== RELEASE_ROOT + APK_NAME) return null;
  try {
    let payload = null;
    if (current.signed_update !== undefined) {
      payload = JSON.parse(current.signed_update.payload);
      if (!payload || ['version', 'size', 'sha256', 'version_code'].some(key => payload[key] !== current[key]) ||
          !validApkUrls(payload.apk_urls)) return null;
    }
    // Verify discovery signatures and mapping before normalization; never rewrite signed bytes.
    // Existing ordinary 1.2.x metadata keeps its previous consistency-check behavior.
    const version = await releaseVersion(current, payload);
    const normalized = { ...current, version };
    const asset = matchAsset(release, normalized, APK_NAME);
    if (version !== current.version) {
      const source = current.corresponding_source;
      const archives = release.assets?.filter(item => item.name === source.asset) || [];
      if (archives.length !== 1 || archives[0].state !== 'uploaded' || archives[0].size !== source.size ||
          archives[0].digest !== 'sha256:' + source.sha256) return null;
    }
    return asset ? { asset, version } : null;
  } catch { return null; }
}

async function fetchJson(url, headers) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) throw new Error('Release source temporarily unavailable.');
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function readMagirecoRelease(env) {
  const token = env?.GITHUB_RELEASES_TOKEN;
  if (!token) throw new Error('Release mirror is not configured.');
  const publicHeaders = { Accept: 'application/json', 'Cache-Control': 'no-cache', 'User-Agent': 'MadeInMagius-Site/2.0' };
  const [client, release] = await Promise.all([
    fetchJson(METADATA_ROOT + METADATA_NAME, publicHeaders).catch(() => null),
    fetchJson(REPO_API + '/releases/tags/latest', {
      Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token,
      'User-Agent': 'MadeInMagius-Site/2.0', 'X-GitHub-Api-Version': '2022-11-28',
      'Cache-Control': 'no-cache',
    }),
  ]);
  if (!release || release.draft || release.prerelease) {
    throw new Error('The release is synchronizing. Please refresh shortly.');
  }
  const selected = await currentAsset(release, client);
  if (!selected) throw new Error('The release is synchronizing. Please refresh shortly.');
  const { asset: apk, version } = selected;
  // Pin the upstream asset ID for this request, not the mutable "latest" URL.
  // A replaced asset yields an error rather than silently sending another APK.
  return {
    version,
    size: client.size,
    sha256: client.sha256,
    source: 'current',
    updated: client.updated || apk.updated_at || null,
    download: './downloads/magireco/android?sha256=' + client.sha256,
    asset: {
      id: apk.id,
      name: 'magireco-cn-' + version + '.apk',
      size: client.size,
      digest: 'sha256:' + client.sha256,
      content_type: 'application/vnd.android.package-archive',
      url: REPO_API + '/releases/assets/' + apk.id,
    },
  };
}
