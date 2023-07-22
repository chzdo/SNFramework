"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _nodemailer = _interopRequireDefault(require("nodemailer"));
var _nodemailerMailgunTransport = _interopRequireDefault(require("nodemailer-mailgun-transport"));
var _handlebars = _interopRequireDefault(require("handlebars"));
var _fsExtra = _interopRequireDefault(require("fs-extra"));
var _path = _interopRequireDefault(require("path"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const {
  ENV,
  TEST_EMAIL = "test@test.com"
} = process.env;
const subjectRegex = /<title>(.+)<\/title>/;
class Mailer {
  #mailer;
  templates = {};
  useHandleBars = false;
  defaultTemplate = /\${((\w+)\.)?(\w+)}/g;
  constructor(props) {
    Object.assign(this, props);
    const auth = props.HOST ? {
      host: props.HOST,
      port: props.PORT,
      auth: props.AUTH
    } : {
      auth: {
        api_key: this.KEY,
        domain: this.DOMAIN
      }
    };
    this.#mailer = props.HOST ? _nodemailer.default.createTransport(auth) : _nodemailer.default.createTransport((0, _nodemailerMailgunTransport.default)(auth));
    if (this.useHandleBars) {
      this.defaultTemplate = /{{((\w+)\.)?(\w+)}}/g;
      _fsExtra.default.readdirSync('./mails/partials').forEach(async file => {
        const parts = /(\w+).(hbs)/.exec(file);
        const source = await _fsExtra.default.readFile(_path.default.resolve(`./mails/partials/${file}`), "utf8");
        _handlebars.default.registerPartial(parts[1], source);
      });
    }
  }
  async sendMail({
    from = this.FROM,
    subject,
    templateName,
    tags = {},
    to = [],
    attachments = [],
    recipientVariable = {}
  }) {
    let {
      subject: subjectTemplate,
      body
    } = await this.getTemplates(templateName);
    subject = subject || subjectTemplate;
    let finalTags = {
      ...tags
    };
    if (this.useHandleBars) {
      finalTags = Object.fromEntries(tags);
      body = body(Object.fromEntries(tags));
    } else {
      body = this.replaceTags(body, finalTags);
    }
    if (!ENV) {
      to = TEST_EMAIL;
      recipientVariable[TEST_EMAIL] = {
        id: Object.keys(recipientVariable).length,
        name: "TEST",
        email: TEST_EMAIL
      };
    }
    const send = this.#mailer.sendMail({
      from,
      subject: this.replaceTags(subject, finalTags),
      to: !ENV ? TEST_EMAIL : to,
      html: body,
      attachments,
      'recipient-variables': JSON.stringify(recipientVariable)
    });
    if (!send) {
      return new Error(send);
    }
    return true;
  }
  async getTemplates(templateName) {
    let template = this.templates[templateName];
    if (!template) {
      const fileName = this.useHandleBars ? `${templateName}.hbs` : `${templateName}.html`;
      let source = await _fsExtra.default.readFile(_path.default.resolve(`./mails/${fileName}`), "utf8");
      let subject, body;
      if (this.useHandleBars) {
        subject = subjectRegex.exec(source)[1];
        body = _handlebars.default.compile(source);
        this.templates[templateName] = template;
      } else {
        subject = subjectRegex.exec(source)[1];
        body = source.replace(subjectRegex, "");
      }
      template = {
        subject,
        body
      };
      this.templates[templateName] = template;
    }
    return template;
  }
  replaceTags(source, tags, {
    template = this.defaultTemplate,
    keepMissingTags = false
  } = {}) {
    if (!source || !tags) {
      return source;
    }
    return source.replace(template, function (match, g1, g2, g3) {
      const container = g2 ? tags[g2] || {} : tags;
      return container[g3] === undefined ? keepMissingTags ? match : "" : container[g3];
    });
  }
}
var _default = Mailer;
exports.default = _default;