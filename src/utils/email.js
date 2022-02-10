/* eslint-disable no-async-promise-executor */
'use strict'
const nodemailer = require('nodemailer')
const emailTemplate = require('../../config.json')

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false,

    },
})

module.exports = {
    sendEmailRecoryPassword (strTo, hasEmail, newPass, resetPasswordUrl = '', userData) {
        return new Promise(async (resolve, reject) => {
            try {
                let message
                
                if (hasEmail) {
                    message = `Olá ${userData.name}, você solicitou a recuperação da sua senha! <b> ${newPass} </b> <br> Acesse a <a href="${resetPasswordUrl}">plataforma</a> e bons estudos.`
                } else {
                    message = `Olá, o usuário ${userData.name} com número de CPF ${userData.cpf} requisitou troca de senha. A nova senha gerada para o usuário é: <b> ${newPass} </b> <br> Ao entrar na plataforma o mesmo deverá obrigatoriamente trocar a senha <br> Acesse a <a href="${resetPasswordUrl}">plataforma</a> e bons estudos.`
                }
                const html =`<table align="center" border="0" cellpadding="0" cellspacing="0" style="height: 600px; width: 800px;">
                                <tbody>
                                    <tr>
                                        <td height=" 328"><img data-imagetype="External"
                                                src="${emailTemplate.messenger.emailTemplate.thumbnail}" alt="Thumbnail"
                                                style="width:100%; height:100%"> </td>
                                    </tr>
                                    <tr>
                                        <td height="100" style="text-align: center; vertical-align: middle;">
                                            <div class="content"
                                                style="font-size:1.5rem; font-weight:bold; text-align:center; font-family:ubuntu,Roboto,sans-serif; width:60%; margin-left:20%">
                                                ${message}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td height="100" style="text-align: center;"><a
                                                href="${resetPasswordUrl}"
                                                target="_blank"
                                                style="font-size: 1rem; border: 0px; text-transform: uppercase; text-align: center; text-decoration: none; border-radius: 5px; color: rgb(255, 255, 255); font-weight: bold; font-family: Ubuntu, Roboto, sans-serif; padding: 1rem; background-color: ${emailTemplate.messenger.emailTemplate.primary} !important;">Acessar</a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td height="75"><img data-imagetype="External"
                                                src="${emailTemplate.messenger.emailTemplate.footer}" alt="Footer"
                                                style="width:100%; height:100%"> </td>
                                    </tr>
                                </tbody>
                            </table>`
                await transporter.sendMail({
                    from: '"Happlearning" <noreply@happmobi.com.br>',
                    to: strTo,
                    subject: 'Reiniciar senha',
                    text: 'Reiniciar senha',
                    html,
                })

                resolve()
            } catch (error) {
                console.log(error)
                reject(error)
            }
        })
    },

    sendResetedPasswordToUser (strTo, newPass = '', domain = '', userData) {
        return new Promise(async (resolve, reject) => {
            try {
                const message = `Olá ${userData.name}, um administrador gerou uma nova senha para você. Sua nova senha é: <b> ${newPass} </b> <br> Acesse a <a href="${domain}">plataforma</a> e bons estudos.`

                const html = `<html>
                                <head></head>
                                <body>
                                    ${message}
                                </body>
                              </html>`
                await transporter.sendMail({
                    from: '"Happlearning" <noreply@happmobi.com.br>',
                    to: strTo,
                    subject: 'Nova senha',
                    text: 'Nova senha',
                    html,
                })

                resolve()
            } catch (error) {
                console.log(error)
                reject(error)
            }
        })
    },

    sendSignupActivationEmail (strTo, activationLink) {
        return new Promise(async (resolve, reject) => {
            try {
                const html = `<html xmlns="http://www.w3.org/1999/xhtml">

                <head>
                  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                  <title>Demystifying Email Design</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                </head>
                
                <body style="font-family: Arial, sans-serif;">
                  <table align="center" cellpadding="0" cellspacing="0" width="600">
                  <tr bgcolor="red">
                    <td style="height: 10vh;text-align: center;">
                        <h1 style="margin-top: 20px; font-weight: bold; color: white;">Happlearning</h1>
                    </td>
                  </tr>
                    <tr>
                      <td bgcolor="#ffffff" style="padding: 40px 30px 40px 30px;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                           <td>
                            <b>Ativação de conta</b>
                           </td>
                          </tr>
                          <tr>
                           <td style="padding: 20px 0 30px 0;">
                            Para começar a utilizar sua conta na plataforma, clique no botão abaixo
                           </td>
                          </tr>
                          <tr>
                           <td>
                            <a href="${activationLink}" style="width: 10vw;height: 5vh; background-color: red; border-radius: 5px; border: none; color: white;font-weight: bold;padding: 0.7em;text-decoration: none;">ATIVAR CONTA</a>
                           </td>
                          </tr>
                         </table>
                       </td>
                    </tr>
                    <tr bgcolor="gray">
                      <td style="height: 10vh;">
                      </td>
                    </tr>
                  </table>
                </body>
                
                </html>`
                await transporter.sendMail({
                    from: '"Happlearning" <suporte.happlearning@happmobi.com.br>',
                    to: strTo,
                    subject: 'Ativação da sua conta para treinamento sobre Happlearning',
                    text: 'Ativação de conta',
                    html,
                })

                resolve()
            } catch (error) {
                console.log(error)
                reject(error)
            }
        })
    },

    sendNotificationEmail (strTo, strTitle, strContent) {
        return new Promise(async (resolve, reject) => {
            try {
                const html = `<html xmlns="http://www.w3.org/1999/xhtml">

                <head>
                  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                  <title>"${strTitle}"</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                </head>
                
                <body style="font-family: Arial, sans-serif;">
                  <table align="center" cellpadding="0" cellspacing="0" width="600">
                  <tr bgcolor="red">
                    <td style="height: 10vh;text-align: center;">
                        <h1 style="margin-top: 20px; font-weight: bold; color: white;">Happlearning</h1>
                    </td>
                  </tr>
                    <tr>
                      <td bgcolor="#ffffff" style="padding: 40px 30px 40px 30px;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                           <td>
                            <b>Notificação de conta</b>
                           </td>
                          </tr>
                          <tr>
                           <td style="padding: 20px 0 30px 0;">
                            ${strContent}
                           </td>
                          </tr>
                         </table>
                       </td>
                    </tr>
                    <tr bgcolor="gray">
                      <td style="height: 10vh;">
                      </td>
                    </tr>
                  </table>
                </body>
                
                </html>`
                await transporter.sendMail({
                    from: '"Happlearning" <suporte.happlearning@happmobi.com.br>',
                    to: strTo,
                    subject: strTitle,
                    text: 'Notificação de conta',
                    html,
                })

                resolve()
            } catch (error) {
                console.log(error)
                reject(error)
            }
        })
    },

    sendLogEmail (type, error, totalUsers = null, totalUsersCreated = null, totalUsersUpdated = null, totalUsersWithoutLogin = null, data = null, totalUsersInactive = null, totalUsersActiveBD = null, totalUsersInactiveBD = null) {
        return new Promise(async (resolve, reject) => {
            try {
                let message

                if (type === 'error') {
                    message = `<div class="body-text" style="font-family:Helvetica, Arial, sans-serif;font-size:14px;line-height:20px;text-align:left;color:#333333">
                                    <div><h4>Segue abaixo relatório da carga diária:</h4></div>
                                    <div><span style="color: red; padding-right: 5px; padding-bottom: 10px;">Mensagem de Erro:</span><span>${error.message}</span></div>
                                    <div><span style="color: red; padding-right: 5px">Erro:</span><span>${error.stack}</span></div>
                                </div>`
                }

                if (type === 'success') {
                    message = `<div class="body-text" style="font-family:Helvetica, Arial, sans-serif;font-size:14px;line-height:20px;text-align:left;color:#333333">
                                <div><h4>Segue abaixo relatório da carga diária:</h4></div>
                                <div><strong style="color: black; padding-right: 5px">Data do arquivo:</strong><span>${data}</span></div>
                                <div><strong style="color: black; padding-right: 5px">Total de usuários no arquivo:</strong><span>${totalUsers}</span></div>
                                <div><strong style="color: black; padding-right: 5px">Total de usuários sem login de rede:</strong><span>${totalUsersWithoutLogin}</span></div>
                                <div><strong style="color: black; padding-right: 5px">Total de usuários inativos:</strong><span>${totalUsersInactive}</span></div>
                                <div><strong style="color: black; padding-right: 5px">Total de usuários a serem atualizados/cadastrados:</strong><span>${totalUsers - totalUsersWithoutLogin}</span></div>
                                <div><strong style="color: black; padding-right: 5px">Total de usuários cadastrados no banco de dados:</strong><span>${totalUsersCreated}</span></div>
                                <div><strong style="color: black; padding-right: 5px">Total de usuários atualizados no banco de dados:</strong><span>${totalUsersUpdated}</span></div>
                                <div><strong style="color: black; padding-right: 5px">Total de usuários ativos no banco de dados:</strong><span>${totalUsersActiveBD.length}</span></div>
                                <div><strong style="color: black; padding-right: 5px">Total de usuários inativos no banco de dados:</strong><span>${totalUsersInactiveBD.length}</span></div>
                             </div>`
                }

                const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
                    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml"
                        xmlns:o="urn:schemas-microsoft-com:office:office">
                    <head>
                        <!--[if gte mso 9]><xml>
                    <o:OfficeDocumentSettings>
                        <o:AllowPNG/>
                        <o:PixelsPerInch>96</o:PixelsPerInch>
                    </o:OfficeDocumentSettings>
                    </xml><![endif]-->
                        <!-- fix outlook zooming on 120 DPI windows devices -->
                        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1"> <!-- So that mobile will display zoomed in -->
                        <meta http-equiv="X-UA-Compatible" content="IE=edge"> <!-- enable media queries for windows phone 8 -->
                        <meta name="format-detection" content="date=no"> <!-- disable auto date linking in iOS 7-9 -->
                        <meta name="format-detection" content="telephone=no"> <!-- disable auto telephone linking in iOS 7-9 -->
                        <title>Inota.me</title>
                        <style type="text/css">
                            body {
                                margin: 0;
                                padding: 0;
                                -ms-text-size-adjust: 100%;
                                -webkit-text-size-adjust: 100%;
                            }
                            table {
                                border-spacing: 0;
                                margin-bottom: 25px;
                            }
                            table td {
                                border-collapse: collapse;
                            }
                            .ExternalClass {
                                width: 100%;
                            }
                            .ExternalClass,
                            .ExternalClass p,
                            .ExternalClass span,
                            .ExternalClass font,
                            .ExternalClass td,
                            .ExternalClass div {
                                line-height: 100%;
                            }
                            .ReadMsgBody {
                                width: 100%;
                                background-color: #ebebeb;
                            }
                            table {
                                mso-table-lspace: 0pt;
                                mso-table-rspace: 0pt;
                            }
                            img {
                                -ms-interpolation-mode: bicubic;
                            }
                            .yshortcuts a {
                                border-bottom: none !important;
                            }
                            @media screen and (max-width: 599px) {
                                .force-row,
                                .container {
                                    width: 100% !important;
                                    max-width: 100% !important;
                                }
                            }
                            @media screen and (max-width: 400px) {
                                .container-padding {
                                    padding-left: 12px !important;
                                    padding-right: 12px !important;
                                }
                            }
                            .ios-footer a {
                                color: #aaaaaa !important;
                                text-decoration: underline;
                            }
                            a[href^="x-apple-data-detectors:"],
                            a[x-apple-data-detectors] {
                                color: inherit !important;
                                text-decoration: none !important;
                                font-size: inherit !important;
                                font-family: inherit !important;
                                font-weight: inherit !important;
                                line-height: inherit !important;
                            }
                        </style>
                    </head>
                    <body style="margin:0; padding:0;" bgcolor="#F0F0F0" leftmargin="0" topmargin="0" marginwidth="0" marginheight="0" margin-bottom: 50px;>
                        <table border="0" width="100%" height="100%" cellpadding="0" cellspacing="0" bgcolor="#F0F0F0">
                            <tr>
                                <td align="center" valign="top" bgcolor="#F0F0F0" style="background-color: #F0F0F0;">
                                    <br>
                                    <table border="0" width="600" cellpadding="0" cellspacing="0" class="container"
                                        style="width:600px;max-width:600px">
                                        <tr>
                                            <td class="container-padding header" align="left"
                                                style="font-family:Helvetica, Arial, sans-serif;font-size:24px;font-weight:bold;padding-bottom:12px;padding-top:12px;color:white;background:#00676a;padding-left:24px;padding-right:24px">
                                                HappLearning
                                            </td>
                                        </tr>
                                        <tr>
                                            <td class="container-padding content" align="left"
                                                style="padding-left:24px;padding-right:24px;padding-top: 5px;padding-bottom:12px;background-color:#ffffff">
                                                <br>
                                                <div class="title"
                                                    style="font-family:Helvetica, Arial, sans-serif;font-size:18px;font-weight:600;color:#374550">
                                                Olá,</div>
                                                <hr>
                                                <br>
                                                ${message}
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>

                    </html>`

                await transporter.sendMail({
                    from: '<academiadamodacea@happmobi.com.br>',
                    to: 'academiadamodacea@happmobi.com.br',
                    subject: 'RELATÓRIO DA CARGA DIÁRIA',
                    text: 'Relatório da carga diária',
                    html,
                })

                resolve()
            } catch (error) {
                reject(error)
            }
        })
    },
}
