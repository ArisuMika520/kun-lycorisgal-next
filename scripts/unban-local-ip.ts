import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

async function main() 
{
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectRoot = path.resolve(__dirname, '..');
    dotenv.config({ path: path.join(projectRoot, '.env') });

    const { delKv, redis } = await import('../lib/redis');
    const { KUN_PATCH_PERMANENT_BAN_USER_KEY } = await import('../config/redis');

    const ipToUnban = '127.0.0.1';

    try 
    {
        const redisKey = `${KUN_PATCH_PERMANENT_BAN_USER_KEY}:${ipToUnban}`;
        console.log(`请求删除被封禁IP: ${ipToUnban}`);
        console.log(`Constructed redis key to delete (without prefix): ${redisKey}`);
        
        await delKv(redisKey);

        console.log(`\n成功删除IP: ${ipToUnban} 的封禁记录`);
        console.log('你现在可以从本地注册了');
    } 
    catch (error) 
    {
        console.error('删除IP封禁记录时出错:', error);
    } 
    finally 
    {
        redis.disconnect();
    }
}

main();