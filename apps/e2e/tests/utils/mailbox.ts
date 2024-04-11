import { Page } from '@playwright/test';
import { parse } from 'node-html-parser';

export class Mailbox {
  constructor(
    private readonly page: Page
  ) {
  }

  async visitMailbox(email: string) {
    const mailbox = email.split('@')[0];

    console.log(`Visiting mailbox ${mailbox} ...`)

    if (!mailbox) {
      throw new Error('Invalid email');
    }

    const json = await this.getInviteEmail(mailbox);

    if (!json.body) {
      console.log(json);

      throw new Error('Email body was not found');
    }

    const html = (json.body as { html: string }).html;
    const el = parse(html);

    const linkHref = el.querySelector('a')?.getAttribute('href');

    if (!linkHref) {
      throw new Error('No link found in email');
    }

    console.log(`Visiting ${linkHref} ...`);

    return this.page.goto(linkHref);
  }

  async getInviteEmail(
    mailbox: string,
    params = {
      deleteAfter: true
    }
  ) {
    const url = `http://localhost:54324/api/v1/mailbox/${mailbox}`;

    const response = await fetch(url);
    const json = (await response.json()) as Array<{ id: string }>;

    if (!json || !json.length) {
      return;
    }

    const messageId = json[0]?.id;
    const messageUrl = `${url}/${messageId}`;

    const messageResponse = await fetch(messageUrl);

    if (!messageResponse.ok) {
      throw new Error(`Failed to fetch email: ${messageResponse.statusText}`);
    }

    // delete message
    if (params.deleteAfter) {
      await fetch(messageUrl, {
        method: 'DELETE'
      });
    }

    return await messageResponse.json();
  }
}