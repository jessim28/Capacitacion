import { test } from '@playwright/test'
import { HomePage } from '../../pages/clase1/home.page'

test.describe('Suite 1: validacio de pagina de compra', () => {

    test('Ingreso y validaciones', async ({page}) => {
        const home = new HomePage(page);

        await home.open();

        await home.validateTitle();

        await home.login();
        
        await home.pageInventary();
    })
})