import { expect, Locator, Page } from '@playwright/test';


/** Page Object para las acciones de la y seleccion de producto. */
export class HomePage {
    readonly page: Page;
    
    
    readonly usernameInput:     Locator;
    readonly passwordInput:     Locator;
    readonly BtnLogin:          Locator;
    readonly inventarypage:     Locator;
  
    /**
   * Crea una nueva instancia de `Swag Labs`.
   * @param page - Instancia de Playwright `Page` utilizada para interactuar con la interfaz.
   */
constructor(page: Page) {
    this.page = page;

    this.usernameInput =    page.locator('#user-name')
    this.passwordInput =    page.locator('[data-test="password"]')
    this.BtnLogin =         page.locator('#login-button')
    this.inventarypage =    page.locator('.inventory_list')


}

    /*
    Esta funcion esta abrir la url donde se realizara el test
    */
    async open(){
        await this.page.goto('https://www.saucedemo.com/')
    }

    /*
    Esta funcion es para validar que el titulo de la pagina sea "Swag Labs"
    */
    async validateTitle(){
        await expect(this.page).toHaveTitle('Swag Labs')
        console.log('Titulo valido')
        await this.page.waitForTimeout(1000)
    }

    /**
   * Completa el formulario de ingreso de la pagina.
   */
    async login() {
        await this.usernameInput.fill('standard_user')
        await this.page.waitForTimeout(2000)

        await this.passwordInput.fill('secret_sauce')
        await this.page.waitForTimeout(2000)

        await this.BtnLogin.click()
        await this.page.waitForTimeout(2000)

    }

    /**
   * Validar que la pagina de producto cargo y es visible.
   */
    async pageInventary(){
        await expect(this.inventarypage).toBeVisible()
        console.log('Pagina de compra visible')
    }


}