import { lazy, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { strCamelCase, strFormat } from '@dimjs/utils';
import './main.less';

function Test() {
  const [config, setConfig] = useState<{ name: string; base: string }>();
  const illegalCode = 'http://test.example.com';

  const illegalCode2 = useMemo(() => {
    return 'http://test2.example.com';
  }, []);

  const handleClick = async () => {
    const configData = await import('./config');
    console.log('configData', configData);
    setConfig(configData.config);
  };

  const Chunk = lazy(
    () => import(/*webpackChunkName:"flatjs/evolve/home/chunks" */ './Dynamic')
  );

  return (
    <div>
      <Chunk />
      <div className="logo">Example assets home</div>
      <span>illegalCode2: {illegalCode2}</span>
      <div className="flat-font">
        example for assets {strCamelCase('example-assets-a')}
      </div>
      <span>illegalCode: {illegalCode}</span>
      <div className="illegal-bg">Illegal background</div>
      <span>strFormat: {strFormat('12345678901')}</span>
      <button onClick={handleClick}>handleClick</button>
      <span>config: {config?.base}</span>
    </div>
  );
}
const container = document.getElementById('app');

if (container) {
  createRoot(container).render(<Test />);
}
