import {currentLocale} from './index';

const captainNames={en:'Captain of the Ford',th:'นายกองแห่งท่าข้าม',ja:'渡河地点の隊長'} as const;
export const fordCaptainName=()=>captainNames[currentLocale()];
