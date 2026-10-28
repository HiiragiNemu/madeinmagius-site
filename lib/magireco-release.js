const METADATA_ROOT = 'https://magireco-personal-release.pages.dev/';
const REPO_API = 'https://api.github.com/repos/HiiragiNemu/ProgettoMagius-1';
const RELEASE_ROOT = 'https://github.com/HiiragiNemu/ProgettoMagius-1/releases/download/latest/';
// One product, one release line. Upstream aliases may carry the same APK, but
// the website selects only current; the fixed 1.1.11 bridge is not a fallback.
const METADATA_NAME = 'magireco-current-legacy-client.version.json';
// Pre-135 keeps GitHub latest canonical. Signed135 may use relay current alone
// for old client URL allowlists; the website still pins the fixed135 asset ID.
const APK_NAME = 'magireco-latest-legacy-client.apk';
const APK_135_NAME = 'magireco-legacy-client-1.3.5.apk';
const APK_136_NAME = 'magireco-legacy-client-1.3.6.apk';
const APK_137_NAME = 'magireco-legacy-client-1.3.7.apk';
const APK_138_NAME = 'magireco-legacy-client-1.3.8.apk';
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

const RELEASE_133_CONTRACT = {"version":"1.3.133","display_version":"1.3.3","version_code":1713000887,"sha256":"1c31f585791ee343b9242eddeb168b0962fea7af28fc1ac8a0e0f614e962803a","size":619311116,"source_commit":"6f1fa0d1640fb6d581c5c155713bf6be500920a2","corresponding_source":{"asset":"magireco-legacy-client-1.3.3-corresponding-source.zip","sha256":"144a88c3357ee9158b2fac2873e987f20daf83ab8126b4d321b72f020e38b643","size":729655725},"single_line_migration":{"schema":2,"mode":"true-1.2-single-apk","minimum_version":"1.3.3","to_line":"1.2","legacy_discovery":{"display_version":"1.3.3","version":"1.3.133"},"old_1_3_manual_install_once":false,"from":{"source_commit":"4a1d01f4599927a889a015dc217f79e7fb0c75d8","size":462325970,"sha256":"e2fb1e34f87e95ac5cb5a20f9f60e7e9fd745510805d644d8cd3bcb1aa0e70f9","version_code":1713000858,"version":"1.3.4"},"minimum_code":1713000887},"release_notes":["实际安装版本：1.3.3；1.3.133为兼容旧客户端的更新发现序号。覆盖安装保留存档与已安装资源。","补齐1025、1040活动商店及1040命运宝石兑换，保留1022训练商店；对应战斗获得活动币后可按库存兑换。","加入23期自选记忆扭蛋，保留12选4、消费、期次兑换币与商店期限；跨阶段共享币和1614延长期日历同步已纳入。","调整269个普通池及27个自选记忆池的本地平衡分布，保留原消费、十连次序、已有保底及兑换币规则。","常驻巡逻不再因档案时间早于历史开放日期而全部置灰；仍按本人真实章节通关条件开放区域。","按原关卡开放标记同步魔女化身与敌人图鉴解锁，并刷新图鉴页暖缓存；正常推进门槛保持。","Scene0原支援Pt商店两项票券与常驻入口保持一致，不再被早期历史日期隐藏；原价格、终身库存和Film.1推进门槛保留。","修复训练限定任务显示、结算计数与单领/批领；恢复1094的16项原任务，替换该期15项通用重建任务并保留旧领取记录。","修复历史百关模式借用常驻125关帮助的问题，保留各自关数、路由和已有存档；历史模式第101关继续正确拒绝。","补入12张已确认的原始横幅图片，保留既有图片与轮播日期/路由次序；真正缺图的条目保持空白。","纳入CN014公告中文批次；修复旧外部公告包遮蔽新APK内置内容，损坏或截断包回退内置包并保留自定义内容。","已知保留问题：起始和永远1049/1083真实活动入口尚待恢复；1040现采用AP入场而非KEY。最终实机回归由玩家反馈确认。"]};

function bound133Contract(client, payload) {
  const contract = RELEASE_133_CONTRACT;
  const fields = ['version','display_version','version_code','sha256','size','source_commit',
                  'corresponding_source','single_line_migration','release_notes'];
  const migration = { ...DISCOVERY_MIGRATION, minimum_version:'1.3.3', minimum_code:contract?.version_code,
    legacy_discovery:{version:'1.3.133',display_version:'1.3.3'} };
  if (!contract || !sameJson(Object.keys(contract).sort(), [...fields].sort()) ||
      contract.version !== '1.3.133' || contract.display_version !== '1.3.3' ||
      contract.version_code !== 1713000887 ||
      !/^[a-f0-9]{64}$/.test(contract.sha256 || '') || !Number.isSafeInteger(contract.size) || contract.size <= 0 || contract.size > 1073741824 ||
      !/^[a-f0-9]{40}$/.test(contract.source_commit || '') || !sameJson(contract.single_line_migration,migration) ||
      !Array.isArray(contract.release_notes) || contract.release_notes.length === 0 || contract.release_notes.some(note => typeof note !== 'string' || !note) ||
      contract.corresponding_source?.asset !== 'magireco-legacy-client-1.3.3-corresponding-source.zip' ||
      !sameJson(Object.keys(contract.corresponding_source).sort(), ['asset','sha256','size']) ||
      !/^[a-f0-9]{64}$/.test(contract.corresponding_source.sha256 || '') ||
      !Number.isSafeInteger(contract.corresponding_source.size) || contract.corresponding_source.size <= 0) {
    throw new Error('133 release identity is not frozen and bound');
  }
  for (const field of fields) {
    if (!sameJson(client[field],payload[field]) ||
        (field !== 'corresponding_source' && !sameJson(payload[field],contract[field]))) {
      throw new Error('133 release contract mismatch: ' + field);
    }
  }
  for (const field of ['asset','sha256','size']) {
    if (!sameJson(payload.corresponding_source?.[field],contract.corresponding_source[field])) {
      throw new Error('133 GPL contract mismatch: ' + field);
    }
  }
  return contract;
}

const RELEASE_135_CONTRACT = {"version":"1.3.135","display_version":"1.3.5","version_code":1713000889,"sha256":"8deec9afd8297cca489c8e8cf8ff766a4aacb1b507f7ef6f936efa71a9da0d7e","size":131473992,"source_commit":"50ede236f903b6ce9d9253fa32b4789e7d1c12b1","corresponding_source":{"asset":"magireco-legacy-client-1.3.5-corresponding-source.zip","sha256":"fd90681e9aa93ed02ee1d55ac276475d15bd7acec884948239967d2a42698d87","size":733668080},"single_line_migration":{"schema":2,"mode":"true-1.2-single-apk","minimum_version":"1.3.5","to_line":"1.2","legacy_discovery":{"version":"1.3.135","display_version":"1.3.5"},"old_1_3_manual_install_once":false,"from":{"source_commit":"4a1d01f4599927a889a015dc217f79e7fb0c75d8","size":462325970,"sha256":"e2fb1e34f87e95ac5cb5a20f9f60e7e9fd745510805d644d8cd3bcb1aa0e70f9","version_code":1713000858,"version":"1.3.4"},"minimum_code":1713000889},"release_notes":["实际安装版本：1.3.5；更新发现编号为 1.3.135，版本代码 1713000889，覆盖此前误发版本号，不清除现有存档。","精简客户端至约 131 MB；离线资源改为第 17 包 cn_offline_update.zip，首次下载后复用，后续按包更新。","新增第 17 包签名、完整性检查及安装复用；中文公告资源包含 CN018。","修正选关场景误用战斗 BGM 的配置与切换逻辑；实际听感及剩余玩法由玩家继续测试。","每个仓库仅新增一份固定版本 APK，兼容下载入口转发；对应源码随版本提供。"]};

function bound135Contract(client, payload) {
  const contract = RELEASE_135_CONTRACT;
  const fields = ['version','display_version','version_code','sha256','size','source_commit',
                  'corresponding_source','single_line_migration','release_notes'];
  const migration = { ...DISCOVERY_MIGRATION, minimum_version:'1.3.5', minimum_code:contract?.version_code,
    legacy_discovery:{version:'1.3.135',display_version:'1.3.5'} };
  if (!contract || !sameJson(Object.keys(contract).sort(), [...fields].sort()) ||
      contract.version !== '1.3.135' || contract.display_version !== '1.3.5' ||
      contract.version_code !== 1713000889 ||
      !/^[a-f0-9]{64}$/.test(contract.sha256 || '') || !Number.isSafeInteger(contract.size) || contract.size <= 0 || contract.size > 1073741824 ||
      !/^[a-f0-9]{40}$/.test(contract.source_commit || '') || !sameJson(contract.single_line_migration,migration) ||
      !Array.isArray(contract.release_notes) || contract.release_notes.length === 0 || contract.release_notes.some(note => typeof note !== 'string' || !note) ||
      contract.corresponding_source?.asset !== 'magireco-legacy-client-1.3.5-corresponding-source.zip' ||
      !sameJson(Object.keys(contract.corresponding_source).sort(), ['asset','sha256','size']) ||
      !/^[a-f0-9]{64}$/.test(contract.corresponding_source.sha256 || '') ||
      !Number.isSafeInteger(contract.corresponding_source.size) || contract.corresponding_source.size <= 0) {
    throw new Error('135 release identity is not frozen and bound');
  }
  for (const field of fields) {
    if (!sameJson(client[field],payload[field]) ||
        (field !== 'corresponding_source' && !sameJson(payload[field],contract[field]))) {
      throw new Error('135 release contract mismatch: ' + field);
    }
  }
  for (const field of ['asset','sha256','size']) {
    if (!sameJson(payload.corresponding_source?.[field],contract.corresponding_source[field])) {
      throw new Error('135 GPL contract mismatch: ' + field);
    }
  }
  return contract;
}

const RELEASE_136_CONTRACT = {"version":"1.3.136","display_version":"1.3.6","version_code":1713000891,"sha256":"5d1877a62ebbeae6b22b239fd1d7a942061dc1e35a124ae5e59444f0bd41ab2f","size":131473992,"source_commit":"db37bf490a2e8fd663defa30cc6bab10ec3f73f1","corresponding_source":{"asset":"magireco-legacy-client-1.3.6-corresponding-source.zip","sha256":"3841b254539de3ed522871a2c3c99e32d70165d6e20c108c8a6d9904d5d40e36","size":736225508},"single_line_migration":{"schema":2,"mode":"true-1.2-single-apk","minimum_version":"1.3.6","to_line":"1.2","legacy_discovery":{"version":"1.3.136","display_version":"1.3.6"},"old_1_3_manual_install_once":false,"from":{"source_commit":"4a1d01f4599927a889a015dc217f79e7fb0c75d8","size":462325970,"sha256":"e2fb1e34f87e95ac5cb5a20f9f60e7e9fd745510805d644d8cd3bcb1aa0e70f9","version_code":1713000858,"version":"1.3.4"},"minimum_code":1713000891},"release_notes":["实际安装版本：1.3.6；1.3.136 为兼容旧客户端的更新发现序号。覆盖安装保留存档与已安装资源。","修复1号 scenario 与2号 JS 热更新在重试、重下和资源恢复时丢失发行签名身份，导致下载完成后安装失败的问题。","保留签名与完整性校验、断点续传及已完成资源复用；保留用户离线导入，不修改玩法和第17资源包。"]};

function bound136Contract(client, payload) {
  const contract = RELEASE_136_CONTRACT;
  const fields = ['version','display_version','version_code','sha256','size','source_commit',
                  'corresponding_source','single_line_migration','release_notes'];
  const migration = { ...DISCOVERY_MIGRATION, minimum_version:'1.3.6', minimum_code:contract?.version_code,
    legacy_discovery:{version:'1.3.136',display_version:'1.3.6'} };
  if (!contract || !sameJson(Object.keys(contract).sort(), [...fields].sort()) ||
      contract.version !== '1.3.136' || contract.display_version !== '1.3.6' ||
      contract.version_code !== 1713000891 ||
      !/^[a-f0-9]{64}$/.test(contract.sha256 || '') || !Number.isSafeInteger(contract.size) || contract.size <= 0 || contract.size > 1073741824 ||
      !/^[a-f0-9]{40}$/.test(contract.source_commit || '') || !sameJson(contract.single_line_migration,migration) ||
      !Array.isArray(contract.release_notes) || contract.release_notes.length === 0 || contract.release_notes.some(note => typeof note !== 'string' || !note) ||
      contract.corresponding_source?.asset !== 'magireco-legacy-client-1.3.6-corresponding-source.zip' ||
      !sameJson(Object.keys(contract.corresponding_source).sort(), ['asset','sha256','size']) ||
      !/^[a-f0-9]{64}$/.test(contract.corresponding_source.sha256 || '') ||
      !Number.isSafeInteger(contract.corresponding_source.size) || contract.corresponding_source.size <= 0) {
    throw new Error('136 release identity is not frozen and bound');
  }
  for (const field of fields) {
    if (!sameJson(client[field],payload[field]) ||
        (field !== 'corresponding_source' && !sameJson(payload[field],contract[field]))) {
      throw new Error('136 release contract mismatch: ' + field);
    }
  }
  for (const field of ['asset','sha256','size']) {
    if (!sameJson(payload.corresponding_source?.[field],contract.corresponding_source[field])) {
      throw new Error('136 GPL contract mismatch: ' + field);
    }
  }
  if (payload.corresponding_source.url !== RELEASE_ROOT + contract.corresponding_source.asset) {
    throw new Error('136 GPL route mismatch');
  }
  return contract;
}

const RELEASE_137_CONTRACT = {"version":"1.3.137","display_version":"1.3.7","version_code":1713000893,"sha256":"f75d127deaf7599e83a27726887995c6b85244aa4f7cc670d732ef4818266718","size":132916552,"source_commit":"4920330321f606c6fa80997a5672121fcdce837d","corresponding_source":{"asset":"magireco-legacy-client-1.3.7-corresponding-source.zip","sha256":"64ae975ec5fcdbd1edb8ba7c1be60b57a4f921955e62d24baf3912679962ffc0","size":744700668},"single_line_migration":{"schema":2,"mode":"true-1.2-single-apk","minimum_version":"1.3.7","to_line":"1.2","legacy_discovery":{"version":"1.3.137","display_version":"1.3.7"},"old_1_3_manual_install_once":false,"from":{"source_commit":"4a1d01f4599927a889a015dc217f79e7fb0c75d8","size":462325970,"sha256":"e2fb1e34f87e95ac5cb5a20f9f60e7e9fd745510805d644d8cd3bcb1aa0e70f9","version_code":1713000858,"version":"1.3.4"},"minimum_code":1713000893},"release_notes":["实际安装版本：1.3.7；1.3.137 为更新发现序号。覆盖安装保留存档与已安装资源。","修复公告归档加载内存过高，以及固定存档分片被64命名空间额度拒绝引发的清档失败和战斗入口409。","修正心魔结算对原生伤害统计的错误校验，保留真实奖励与重复提交校验；识别开战保存失败留下的准备记录，提供明确退出准备入口，避免残留记录阻挡后续战斗。","修复档案好友列表覆盖本地助战、导致部分主线助战全灰的问题；助战显示与开战统一按所选游玩日期校验，保留剧情指定助战。","修复已确认的敌方Doppel动画编号、御魂特训助战与再战周回、编队字段及海边缎带等活动的掉落映射。","启动与手动检查使用同一更新界面：热更新与APK可独立勾选，可用项默认全选；可查看当期及历史说明，双选先完成资源再更新APK。","本地游玩新增普通活动不激活选项，镜层和心魔独立选择；保留既有下载签名、完整性校验与离线导入。","修正多期卡池原图绑定，并按已核实原始资料补齐对应概率和十连保证；未确认的历史逐项权重及特殊阶梯规则继续单列。"]};

function bound137Contract(client, payload) {
  const contract = RELEASE_137_CONTRACT;
  const fields = ['version','display_version','version_code','sha256','size','source_commit',
                  'corresponding_source','single_line_migration','release_notes'];
  const migration = { ...DISCOVERY_MIGRATION, minimum_version:'1.3.7', minimum_code:contract?.version_code,
    legacy_discovery:{version:'1.3.137',display_version:'1.3.7'} };
  if (!contract || !sameJson(Object.keys(contract).sort(), [...fields].sort()) ||
      contract.version !== '1.3.137' || contract.display_version !== '1.3.7' ||
      contract.version_code !== 1713000893 ||
      !/^[a-f0-9]{64}$/.test(contract.sha256 || '') || !Number.isSafeInteger(contract.size) || contract.size <= 0 || contract.size > 1073741824 ||
      !/^[a-f0-9]{40}$/.test(contract.source_commit || '') || !sameJson(contract.single_line_migration,migration) ||
      !Array.isArray(contract.release_notes) || contract.release_notes.length === 0 || contract.release_notes.some(note => typeof note !== 'string' || !note) ||
      contract.corresponding_source?.asset !== 'magireco-legacy-client-1.3.7-corresponding-source.zip' ||
      !sameJson(Object.keys(contract.corresponding_source).sort(), ['asset','sha256','size']) ||
      !/^[a-f0-9]{64}$/.test(contract.corresponding_source.sha256 || '') ||
      !Number.isSafeInteger(contract.corresponding_source.size) || contract.corresponding_source.size <= 0) {
    throw new Error('137 release identity is not frozen and bound');
  }
  for (const field of fields) {
    if (!sameJson(client[field],payload[field]) ||
        (field !== 'corresponding_source' && !sameJson(payload[field],contract[field]))) {
      throw new Error('137 release contract mismatch: ' + field);
    }
  }
  for (const field of ['asset','sha256','size']) {
    if (!sameJson(payload.corresponding_source?.[field],contract.corresponding_source[field])) {
      throw new Error('137 GPL contract mismatch: ' + field);
    }
  }
  if (payload.corresponding_source.url !== RELEASE_ROOT + contract.corresponding_source.asset) {
    throw new Error('137 GPL route mismatch');
  }
  return contract;
}

const RELEASE_138_CONTRACT = {"version":"1.3.138","display_version":"1.3.8","version_code":1713000895,"sha256":"f140fd086be89b03e9ac65a47fc0cee1daa57561fb49dead6440bd34b9620e0c","size":134530376,"source_commit":"8fca049a800f5ef38588c76f54e260d04a1ec088","corresponding_source":{"asset":"magireco-legacy-client-1.3.8-corresponding-source.zip","sha256":"3f766f2b476f3875f643e35fd2adbccdd4db8e2947ab58a5671ee465192a6896","size":748347281},"single_line_migration":{"schema":2,"mode":"true-1.2-single-apk","minimum_version":"1.3.8","to_line":"1.2","legacy_discovery":{"version":"1.3.138","display_version":"1.3.8"},"old_1_3_manual_install_once":false,"from":{"source_commit":"4a1d01f4599927a889a015dc217f79e7fb0c75d8","size":462325970,"sha256":"e2fb1e34f87e95ac5cb5a20f9f60e7e9fd745510805d644d8cd3bcb1aa0e70f9","version_code":1713000858,"version":"1.3.4"},"minimum_code":1713000895},"release_notes":["实际安装版本：1.3.8；1.3.138 为更新发现序号。覆盖安装保留存档与已安装资源。","修复教程抽卡后的编队引导被遗留筛选条件锁住：引导中显示已拥有角色，完成引导后保留原筛选偏好。","修复教程战斗准备记录与原生教程类型不一致导致的恢复409，保留原战斗、奖励和重复提交校验。","保留1.3.7的本地助战、心魔结算、存储容量与活动修复，以及启动和手动更新双选界面。","支持后续个人发行的1.4、2.0及更高版本升级；仅信任MadeInMagius个人频道、固定发行仓库与发行签名，不接入组织或其他仓库的同名版本。升级仍按APK构建号判断，保留旧客户端的签名更新发现兼容。"]};

function bound138Contract(client, payload) {
  const contract = RELEASE_138_CONTRACT;
  const fields = ['version','display_version','version_code','sha256','size','source_commit',
                  'corresponding_source','single_line_migration','release_notes'];
  const migration = { ...DISCOVERY_MIGRATION, minimum_version:'1.3.8', minimum_code:contract?.version_code,
    legacy_discovery:{version:'1.3.138',display_version:'1.3.8'} };
  if (!contract || !sameJson(Object.keys(contract).sort(), [...fields].sort()) ||
      contract.version !== '1.3.138' || contract.display_version !== '1.3.8' ||
      contract.version_code !== 1713000895 ||
      !/^[a-f0-9]{64}$/.test(contract.sha256 || '') || !Number.isSafeInteger(contract.size) || contract.size <= 0 || contract.size > 1073741824 ||
      !/^[a-f0-9]{40}$/.test(contract.source_commit || '') || !sameJson(contract.single_line_migration,migration) ||
      !Array.isArray(contract.release_notes) || contract.release_notes.length === 0 || contract.release_notes.some(note => typeof note !== 'string' || !note) ||
      contract.corresponding_source?.asset !== 'magireco-legacy-client-1.3.8-corresponding-source.zip' ||
      !sameJson(Object.keys(contract.corresponding_source).sort(), ['asset','sha256','size']) ||
      !/^[a-f0-9]{64}$/.test(contract.corresponding_source.sha256 || '') ||
      !Number.isSafeInteger(contract.corresponding_source.size) || contract.corresponding_source.size <= 0) {
    throw new Error('138 release identity is not frozen and bound');
  }
  for (const field of fields) {
    if (!sameJson(client[field],payload[field]) ||
        (field !== 'corresponding_source' && !sameJson(payload[field],contract[field]))) {
      throw new Error('138 release contract mismatch: ' + field);
    }
  }
  for (const field of ['asset','sha256','size']) {
    if (!sameJson(payload.corresponding_source?.[field],contract.corresponding_source[field])) {
      throw new Error('138 GPL contract mismatch: ' + field);
    }
  }
  if (payload.corresponding_source.url !== RELEASE_ROOT + contract.corresponding_source.asset) {
    throw new Error('138 GPL route mismatch');
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
  const is133 = signed.version === '1.3.133';
  const is135 = signed.version === '1.3.135';
  const is136 = signed.version === '1.3.136';
  const is137 = signed.version === '1.3.137';
  const is138 = signed.version === '1.3.138';
  const bound = is138 ? bound138Contract(client, signed) : is137 ? bound137Contract(client, signed) : is136 ? bound136Contract(client, signed) : is135 ? bound135Contract(client, signed) : is133 ? bound133Contract(client, signed) : is132 ? bound132Contract(client, signed) : is131 ? bound131Contract(client, signed) : is130 ? bound130Contract(client, signed) : is129 ? bound129Contract(client, signed) : is128 ? bound128Contract(client, signed) : null;
  const discovery = is138 ? '1.3.138' : is137 ? '1.3.137' : is136 ? '1.3.136' : is135 ? '1.3.135' : is133 ? '1.3.133' : is132 ? '1.3.132' : is131 ? '1.3.131' : is130 ? '1.3.130' : is129 ? '1.3.129' : is128 ? '1.3.128' : '1.3.127';
  const display = is138 ? '1.3.8' : is137 ? '1.3.7' : is136 ? '1.3.6' : is135 ? '1.3.5' : is133 ? '1.3.3' : is132 ? '1.3.2' : is131 ? '1.3.1' : is130 ? '1.3.0' : is129 ? '1.2.9' : is128 ? '1.2.8' : '1.2.7';
  const migration = bound ? bound.single_line_migration : DISCOVERY_MIGRATION;
  for (const field of ['display_version','compatibility_discovery','single_line_migration']) {
    if (!sameJson(client[field], signed[field])) throw new Error('Unsigned discovery field: ' + field);
  }
  const mapping = signed.compatibility_discovery;
  if (signed.version !== discovery || signed.display_version !== display ||
      !mapping || Array.isArray(mapping) || mapping.schema !== 1 ||
      mapping.discovery_version !== discovery || mapping.installed_public_version !== display ||
      !Number.isSafeInteger(signed.version_code) || signed.version_code <= 1713000868 || signed.version_code > 2147483647 || (!is128 && !is129 && !is130 && !is131 && !is132 && !is133 && !is135 && !is136 && !is137 && !is138 && signed.version_code > 1713000870) ||
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
    (client?.version === '1.3.2' && client.version_code === 1713000885) ||
    (client?.version === '1.3.3' && client.version_code === 1713000887) ||
    (client?.version === '1.3.5' && client.version_code === 1713000889) ||
    (client?.version === '1.3.6' && client.version_code === 1713000891) ||
    (client?.version === '1.3.7' && client.version_code === 1713000893) ||
    (client?.version === '1.3.8' && client.version_code === 1713000895);
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

function validApkUrls(urls, apkName) {
  if (apkName === APK_138_NAME) return sameJson(urls, [RELEASE_ROOT + 'magireco-current-legacy-client.apk']);
  if (apkName === APK_137_NAME) return sameJson(urls, [RELAY_CURRENT_APK_URL]) || sameJson(urls, [RELEASE_ROOT + 'magireco-current-legacy-client.apk']);
  if (apkName === APK_136_NAME) return sameJson(urls, [RELAY_CURRENT_APK_URL]);
  const canonical = RELEASE_ROOT + apkName;
  return sameJson(urls, [canonical]) || sameJson(urls, [canonical, RELAY_CURRENT_APK_URL]) ||
    (apkName === APK_135_NAME && sameJson(urls, [RELAY_CURRENT_APK_URL]));
}

async function currentAsset(release, current) {
  const apkName = current?.version === '1.3.138' ? APK_138_NAME : current?.version === '1.3.137' ? APK_137_NAME : current?.version === '1.3.136' ? APK_136_NAME : current?.version === '1.3.135' ? APK_135_NAME : APK_NAME;
  const relayCurrent = ['1.3.135', '1.3.136', '1.3.137'].includes(current?.version) && current.apk === 'magireco-current-legacy-client.apk' &&
    current.apk_url === RELAY_CURRENT_APK_URL && sameJson(current.apk_urls, [RELAY_CURRENT_APK_URL]);
  const directCurrent = ['1.3.137', '1.3.138'].includes(current?.version) && current.apk === 'magireco-current-legacy-client.apk' &&
    current.apk_url === RELEASE_ROOT + current.apk && sameJson(current.apk_urls, [current.apk_url]);
  if (!current || (!relayCurrent && !directCurrent && (current.apk !== apkName || current.apk_url !== RELEASE_ROOT + apkName))) return null;
  try {
    let payload = null;
    if (current.signed_update !== undefined) {
      payload = JSON.parse(current.signed_update.payload);
      if (!payload || ['version', 'size', 'sha256', 'version_code'].some(key => payload[key] !== current[key]) ||
          !validApkUrls(payload.apk_urls, apkName) || current.apk_url !== payload.apk_urls[0]) return null;
    }
    // Verify discovery signatures and mapping before normalization; never rewrite signed bytes.
    // Existing ordinary 1.2.x metadata keeps its previous consistency-check behavior.
    const version = await releaseVersion(current, payload);
    const normalized = { ...current, version };
    const asset = matchAsset(release, normalized, apkName);
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
