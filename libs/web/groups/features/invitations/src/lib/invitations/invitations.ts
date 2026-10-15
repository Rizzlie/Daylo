import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { AuthSession } from '@daylo/web/core/auth/data-access';

@Component({
  selector: 'lib-invitations',
  imports: [MatCardModule],
  templateUrl: './invitations.html',
  styleUrl: './invitations.scss',
})
export class Invitations {
  private readonly auth = inject(AuthSession);
  protected readonly user = this.auth.user;
}
