import { Controller } from '@nestjs/common';
import { templatesApi } from '@playora/contracts';
import { Route } from '../../common/contract/route.decorator';
import { TemplatesService } from './templates.service';

@Controller()
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Route(templatesApi.list)
  list() {
    return this.templates.list();
  }
}
